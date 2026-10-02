import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";

// Both the refresh token (bos_refresh) AND the access token (bos_access) now
// live only in httpOnly cookies that JS cannot read — an XSS can no longer
// steal a live session credential out of localStorage. `withCredentials`
// makes the browser send both cookies on every call; the backend's
// `authenticate` middleware reads `bos_access` directly, so no
// Authorization header needs to be attached here at all for cookie-capable
// clients (header/API clients without cookie support can still send
// `Authorization: Bearer <token>` manually — the backend accepts both).
// 30 s default (was 15 s): the backend is on Render's free tier, which cold-starts
// in 30–60 s after idling. 15 s meant the first request of the day always failed
// even though the server was on its way up. Individual calls that expect to hit a
// cold server (login, the login-page warm-up ping) pass a longer per-request
// `timeout` on top of this.
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
  withCredentials: true,
});

// ── One-time migration off the localStorage refresh/access tokens ─
// Pre-cookie sessions may still have a refreshToken (or accessToken) sitting
// in localStorage from before either moved to httpOnly cookies. Redeem the
// refresh token once (body form, still accepted) so the server sets fresh
// cookies, then delete both legacy values. After this, auth is cookie-only.
let legacyMigration: Promise<void> | null = null;
function migrateLegacyRefreshToken(): Promise<void> {
  if (legacyMigration) return legacyMigration;
  const legacy = localStorage.getItem("refreshToken");
  if (!legacy) {
    localStorage.removeItem("accessToken");
    legacyMigration = Promise.resolve();
    return legacyMigration;
  }
  legacyMigration = axios
    .post(`${BASE_URL}/auth/refresh`, { refreshToken: legacy },
      { withCredentials: true, headers: { "X-Request-Timestamp": String(Date.now()) } })
    .catch(() => { /* dead token — next 401 sends the user to login */ })
    .then(() => {}) // normalize to void — the response sets cookies directly, nothing to store
    .finally(() => { localStorage.removeItem("refreshToken"); localStorage.removeItem("accessToken"); });
  return legacyMigration;
}

// ── Request interceptor — org context, replay guard ───────────────
// No Authorization header attached here — the bos_access httpOnly cookie
// (sent automatically via withCredentials) is what authenticates the request.
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  await migrateLegacyRefreshToken();
  const orgId = localStorage.getItem("activeOrgId");
  if (orgId) config.headers["x-organization-id"] = orgId;
  config.headers["x-request-timestamp"] = String(Date.now());
  return config;
});

// ── Response interceptor — auto refresh on 401 ────────────────
// Success/failure only now — there's no token value to hand to waiting
// callers any more, the refreshed bos_access cookie is picked up
// automatically by the browser on the retried (withCredentials) request.
let isRefreshing = false;
let refreshSubscribers: ((ok: boolean) => void)[] = [];
function subscribeRefresh(cb: (ok: boolean) => void) { refreshSubscribers.push(cb); }
function notifyRefresh(ok: boolean) { refreshSubscribers.forEach((cb) => cb(ok)); refreshSubscribers = []; }

// ── Cross-tab refresh coordination ──────────────────────────
// Refresh is single-use + rotated server-side, and replaying a rotated-away
// token now revokes the whole session family — so only one tab may redeem at a
// time. Others wait for the shared lock to clear, then retry (cookie is fresh).
const REFRESH_LOCK_KEY = "authRefreshLock";
const REFRESH_LOCK_TTL = 8000;

function acquireRefreshLock(): boolean {
  const existing = Number(localStorage.getItem(REFRESH_LOCK_KEY) || 0);
  if (existing && Date.now() - existing < REFRESH_LOCK_TTL) return false;
  localStorage.setItem(REFRESH_LOCK_KEY, String(Date.now()));
  return true;
}
function releaseRefreshLock() { localStorage.removeItem(REFRESH_LOCK_KEY); }

// Resolves once the OTHER tab's refresh attempt finishes (lock released) —
// doesn't know success/failure, just "safe to retry now"; the retried
// request will itself 401 again if the refresh actually failed.
function waitForOtherTabRefresh(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener("storage", onStorage);
      reject(new Error("Timed out waiting for another tab to refresh"));
    }, REFRESH_LOCK_TTL + 2000);
    function onStorage(e: StorageEvent) {
      if (e.key === REFRESH_LOCK_KEY && e.newValue === null) {
        clearTimeout(timer); window.removeEventListener("storage", onStorage); resolve();
      }
    }
    window.addEventListener("storage", onStorage);
  });
}

async function performRefresh(): Promise<boolean> {
  // Cookie carries the refresh token; body is empty. /auth/refresh is behind
  // replayGuard, hence the timestamp header. The response's Set-Cookie
  // headers refresh bos_access/bos_refresh directly — nothing to store.
  await axios.post(`${BASE_URL}/auth/refresh`, {}, {
    withCredentials: true,
    headers: { "X-Request-Timestamp": String(Date.now()) },
  });
  return true;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean; _dbRetry?: number }) | undefined;
    if (!original) return Promise.reject(error);

    if (error.response?.status === 503 && (error.response.data as { retryable?: boolean })?.retryable) {
      const retries = original._dbRetry ?? 0;
      if (retries < 3) {
        original._dbRetry = retries + 1;
        await new Promise((r) => setTimeout(r, 3000));
        return api(original);
      }
    }

    const isAuthRoute = original.url?.includes("/auth/login") || original.url?.includes("/auth/register")
      || original.url?.includes("/auth/forgot") || original.url?.includes("/auth/reset")
      || original.url?.includes("/auth/refresh");
    if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => subscribeRefresh((ok) => {
          if (ok) resolve(api(original));
          else reject(error);
        }));
      }

      if (!acquireRefreshLock()) {
        try {
          await waitForOtherTabRefresh();
          return api(original);
        } catch {
          hardLogout(); return Promise.reject(error);
        }
      }

      isRefreshing = true;
      try {
        const ok = await performRefresh();
        notifyRefresh(ok);
        return api(original);
      } catch {
        notifyRefresh(false);
        hardLogout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
        releaseRefreshLock();
      }
    }
    return Promise.reject(error);
  }
);

function hardLogout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("activeOrgId");
  localStorage.removeItem("authRefreshLock");
  localStorage.removeItem("businessos-auth");
  window.location.href = window.location.pathname.startsWith("/super-admin") ? "/super-admin/login" : "/login";
}

export default api;
