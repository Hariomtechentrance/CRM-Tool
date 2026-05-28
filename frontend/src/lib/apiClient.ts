import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

const API = import.meta.env.VITE_API_URL ?? "";

export const apiClient = axios.create({ baseURL: API });

apiClient.interceptors.request.use((config) => {
  const { accessToken, activeOrg } = useAuthStore.getState();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (activeOrg?.id) config.headers["x-organization-id"] = activeOrg.id;
  return config;
});
