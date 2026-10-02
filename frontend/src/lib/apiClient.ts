import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

const API = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";

export const apiClient = axios.create({ baseURL: API, withCredentials: true });

// No Authorization header — the bos_access httpOnly cookie (sent via
// withCredentials) authenticates the request, same as lib/api.ts.
apiClient.interceptors.request.use((config) => {
  const { activeOrg } = useAuthStore.getState();
  if (activeOrg?.id) config.headers["x-organization-id"] = activeOrg.id;
  return config;
});
