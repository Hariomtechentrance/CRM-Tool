import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";
import type { User, AuthResponse, OrganizationSummary } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  organizations: OrganizationSummary[];
  activeOrg: OrganizationSummary | null;
  isAuthenticated: boolean;
  moduleAccess: string[];   // module keys the current user can access
  isOrgAdmin: boolean;      // OWNER or ADMIN role in active org

  setAuth: (data: AuthResponse) => void;
  setActiveOrg: (org: OrganizationSummary) => void;
  addOrganization: (org: OrganizationSummary) => void;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  loadModuleAccess: () => Promise<void>;
  setModuleAccess: (keys: string[], isAdmin: boolean) => void;
  updateActiveOrgModules: (enabledModules: string[]) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      organizations: [],
      activeOrg: null,
      isAuthenticated: false,
      moduleAccess: [],
      isOrgAdmin: false,

      setAuth: (data: AuthResponse) => {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        // Normalise: ensure every org has enabledModules array (legacy orgs may not)
        const orgs = data.organizations.map((o) => ({ ...o, enabledModules: o.enabledModules ?? [] }));
        const firstOrg = orgs[0] || null;
        if (firstOrg) localStorage.setItem("activeOrgId", firstOrg.id);
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          organizations: orgs,
          activeOrg: firstOrg,
          isAuthenticated: true,
        });
      },

      setActiveOrg: (org: OrganizationSummary) => {
        localStorage.setItem("activeOrgId", org.id);
        set({ activeOrg: org });
      },

      addOrganization: (org: OrganizationSummary) => {
        localStorage.setItem("activeOrgId", org.id);
        set((state) => ({
          organizations: [...state.organizations, org],
          activeOrg: org,
        }));
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) await api.post("/auth/logout", { refreshToken });
        } catch { /* ignore */ }
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("activeOrgId");
        set({ user: null, accessToken: null, refreshToken: null, organizations: [], activeOrg: null, isAuthenticated: false });
      },

      updateUser: (updates: Partial<User>) => {
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null }));
      },

      setModuleAccess: (keys: string[], isAdmin: boolean) => {
        set({ moduleAccess: keys, isOrgAdmin: isAdmin });
      },

      updateActiveOrgModules: (enabledModules: string[]) => {
        set((state) => {
          if (!state.activeOrg) return {};
          const updated = { ...state.activeOrg, enabledModules };
          return {
            activeOrg: updated,
            organizations: state.organizations.map((o) => o.id === updated.id ? updated : o),
          };
        });
      },

      loadModuleAccess: async () => {
        try {
          const { data } = await api.get("/access/my-access");
          set({ moduleAccess: data.data.moduleKeys ?? [], isOrgAdmin: data.data.isAdmin ?? false });
        } catch {
          set({ moduleAccess: [], isOrgAdmin: false });
        }
      },
    }),
    {
      name: "bl-crm-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        organizations: state.organizations,
        activeOrg: state.activeOrg,
        isAuthenticated: state.isAuthenticated,
        moduleAccess: state.moduleAccess,
        isOrgAdmin: state.isOrgAdmin,
      }),
    }
  )
);
