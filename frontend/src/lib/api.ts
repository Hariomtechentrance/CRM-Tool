import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/authStore";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ── Request interceptor — attach access token, org context & replay guard ─
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("accessToken");
  const orgId = localStorage.getItem("activeOrgId");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (orgId) config.headers["x-organization-id"] = orgId;
  // Replay-attack prevention: server rejects requests whose timestamp
  // is more than 5 minutes stale, so replayed captures expire quickly.
  config.headers["x-request-timestamp"] = String(Date.now());
  return config;
});

// ── Response interceptor — auto refresh token on 401 ────────
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}
function notifyRefresh(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// ── Cross-tab refresh coordination ──────────────────────────
// The refresh token is single-use and rotated server-side on every redemption.
// All tabs of the app share the same localStorage tokens, so if two tabs' access
// tokens expire around the same time, both would otherwise race to redeem the
// SAME refresh token — the server accepts the first and rejects the second as
// already-used, which forces a full logout even though the session is fine.
// A tab that finds another tab already refreshing waits for that tab's result
// (via the native `storage` event) instead of redeeming the token itself.
const REFRESH_LOCK_KEY = "authRefreshLock";
const REFRESH_LOCK_TTL = 8000;

function acquireRefreshLock(): boolean {
  const existing = Number(localStorage.getItem(REFRESH_LOCK_KEY) || 0);
  if (existing && Date.now() - existing < REFRESH_LOCK_TTL) return false;
  localStorage.setItem(REFRESH_LOCK_KEY, String(Date.now()));
  return true;
}

function releaseRefreshLock() {
  localStorage.removeItem(REFRESH_LOCK_KEY);
}

function waitForTokenFromOtherTab(): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener("storage", onStorage);
      reject(new Error("Timed out waiting for another tab to refresh the session"));
    }, REFRESH_LOCK_TTL + 2000);

    function onStorage(e: StorageEvent) {
      if (e.key === "accessToken" && e.newValue) {
        clearTimeout(timer);
        window.removeEventListener("storage", onStorage);
        resolve(e.newValue);
      } else if (e.key === REFRESH_LOCK_KEY && e.newValue === null && !localStorage.getItem("accessToken")) {
        // The refreshing tab released the lock without ever setting a new
        // access token — its refresh attempt genuinely failed.
        clearTimeout(timer);
        window.removeEventListener("storage", onStorage);
        reject(new Error("Session refresh failed in another tab"));
      }
    }
    window.addEventListener("storage", onStorage);
  });
}

async function performRefresh(refreshToken: string): Promise<string> {
  // This bare axios.post (not the `api` instance) deliberately skips the request
  // interceptor to avoid recursive interception — but /auth/refresh sits behind the
  // replayGuard middleware (server.ts) which requires this header on every call,
  // so it must be attached here explicitly or every refresh attempt gets a 400.
  const { data } = await axios.post(
    `${BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { "X-Request-Timestamp": String(Date.now()) } }
  );
  const { accessToken, refreshToken: newRefresh } = data.data;
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", newRefresh);
  // Keep the Zustand-persisted copy in sync too — otherwise logout() (which reads
  // refreshToken from the store) would keep revoking an already-rotated-out token,
  // and the store's tokens would silently drift from the ones actually in use.
  useAuthStore.setState({ accessToken, refreshToken: newRefresh });
  return accessToken;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean; _dbRetry?: number }) | undefined;
    if (!original) return Promise.reject(error);

    // Auto-retry on 503 (database waking up from Neon auto-suspend) up to 3 times
    if (error.response?.status === 503 && (error.response.data as { retryable?: boolean })?.retryable) {
      const retries = original._dbRetry ?? 0;
      if (retries < 3) {
        original._dbRetry = retries + 1;
        await new Promise((r) => setTimeout(r, 3000));
        return api(original);
      }
    }

    // Don't intercept auth endpoints — let login/register handle their own errors
    const isAuthRoute = original.url?.includes("/auth/login") || original.url?.includes("/auth/register") || original.url?.includes("/auth/forgot") || original.url?.includes("/auth/reset");
    if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        clearAuthStorage();
        window.location.href = loginRedirectUrl();
        return Promise.reject(error);
      }
      original._retry = true;

      // Same-tab concurrent requests: queue behind the in-flight refresh.
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeRefresh((newToken) => {
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(original));
          });
        });
      }

      // Cross-tab: another tab is already refreshing — piggyback on its result
      // rather than redeeming the same single-use refresh token ourselves.
      if (!acquireRefreshLock()) {
        try {
          const newToken = await waitForTokenFromOtherTab();
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        } catch {
          clearAuthStorage();
          window.location.href = loginRedirectUrl();
          return Promise.reject(error);
        }
      }

      isRefreshing = true;
      try {
        const accessToken = await performRefresh(refreshToken);
        notifyRefresh(accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        clearAuthStorage();
        window.location.href = loginRedirectUrl();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
        releaseRefreshLock();
      }
    }
    return Promise.reject(error);
  }
);

function clearAuthStorage() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("activeOrgId");
  localStorage.removeItem("authRefreshLock");
  // Also wipe the Zustand persist store so isAuthenticated resets to false on reload,
  // preventing the redirect loop: / → /dashboard (stale auth) → 401 → /login → repeat
  localStorage.removeItem("flowcrm-auth");
}

function loginRedirectUrl() {
  return window.location.pathname.startsWith("/super-admin") ? "/super-admin/login" : "/login";
}

export default api;
