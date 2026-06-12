import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ── Request interceptor — attach access token & org context ─
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("accessToken");
  const orgId = localStorage.getItem("activeOrgId");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (orgId) config.headers["x-organization-id"] = orgId;
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
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeRefresh((newToken) => {
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(original));
          });
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data;
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", newRefresh);
        notifyRefresh(accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        clearAuthStorage();
        window.location.href = loginRedirectUrl();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

function clearAuthStorage() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("activeOrgId");
}

function loginRedirectUrl() {
  return window.location.pathname.startsWith("/super-admin") ? "/super-admin/login" : "/login";
}

export default api;
