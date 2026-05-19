import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Settings, ChevronDown, Building2,
  Users, Package, ShoppingCart, Truck, Receipt,
  ShoppingBag, Warehouse, UserCheck, Kanban,
  Megaphone, Headphones, Globe, BarChart3, Container, Shirt,
  LayoutGrid, PackageOpen,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { getNavModules } from "@/lib/modules";
import type { OrganizationSummary } from "@/types";
import { useState } from "react";

const ICON_MAP: Record<string, React.ElementType> = {
  Users, Package, ShoppingCart, Truck, Receipt,
  ShoppingBag, Warehouse, UserCheck, Kanban,
  Megaphone, Headphones, Globe, BarChart3, Container, Shirt,
  PackageOpen,
  HeadphonesIcon: Headphones,
};

function OrgSwitcherDropdown() {
  const { organizations, activeOrg, setActiveOrg } = useAuthStore();
  const [open, setOpen] = useState(false);
  if (!activeOrg) return null;

  return (
    <div style={{ position: "relative", padding: "0 12px", marginBottom: 16 }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
        style={{ background: open ? "#131327" : "#0F0F22", border: "1px solid #1E1E38" }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          {getInitials(activeOrg.name)}
        </div>
        <div className="flex-1 text-left overflow-hidden min-w-0">
          <p className="text-sm font-semibold truncate leading-tight" style={{ color: "#EEEEF5" }}>{activeOrg.name}</p>
          <p className="text-[11px] truncate" style={{ color: "#505070" }}>{activeOrg.role}</p>
        </div>
        <ChevronDown className={cn("w-4 h-4 flex-shrink-0 transition-transform duration-200", open && "rotate-180")} style={{ color: "#505070" }} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1.5 rounded-xl py-1.5 z-50"
          style={{ background: "#0D0D1F", border: "1px solid #1C1C35", boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
          {organizations.map((org: OrganizationSummary) => (
            <button
              key={org.id}
              onClick={() => { setActiveOrg(org); setOpen(false); }}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 transition-colors cursor-pointer", activeOrg.id === org.id ? "bg-indigo-600/10" : "hover:bg-[#131327]")}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                {getInitials(org.name)}
              </div>
              <div className="flex-1 text-left overflow-hidden min-w-0">
                <p className="text-sm truncate font-medium" style={{ color: "#EEEEF5" }}>{org.name}</p>
                <p className="text-[11px]" style={{ color: "#505070" }}>{org.role}</p>
              </div>
              {activeOrg.id === org.id && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#6366f1" }} />}
            </button>
          ))}
          <div style={{ borderTop: "1px solid #1C1C35" }} className="mt-1 pt-1">
            <NavLink
              to="/create-org"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors"
              style={{ color: "#818CF8" }}
            >
              <Building2 className="w-4 h-4" />
              <span className="text-sm font-medium">Add new organization</span>
            </NavLink>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { activeOrg, user, moduleAccess, isOrgAdmin } = useAuthStore();

  // Show only modules the user has been granted access to (admins see all enabled)
  const orgEnabled = Array.isArray(activeOrg?.enabledModules) ? activeOrg!.enabledModules : [];
  const visibleKeys = isOrgAdmin ? orgEnabled : moduleAccess;
  const navModules = getNavModules(visibleKeys);

  return (
    <aside className="h-screen flex flex-col flex-shrink-0"
      style={{ width: 232, background: "#0A0A1A", borderRight: "1px solid #151528" }}>

      {/* Logo */}
      <div className="h-14 flex items-center px-5 flex-shrink-0" style={{ borderBottom: "1px solid #151528" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-lg flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            BL
          </div>
          <span className="font-bold text-base tracking-tight" style={{ color: "#EEEEF5" }}>BL-CRM</span>
        </div>
      </div>

      {/* Org switcher */}
      <div className="pt-4">
        <OrgSwitcherDropdown />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: "0 10px" }}>
        {/* Dashboard — always visible */}
        <p className="text-[10px] font-bold uppercase tracking-widest px-2 mb-2" style={{ color: "#404060", letterSpacing: "0.1em" }}>Overview</p>
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) => cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 mb-1",
            isActive ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20" : "text-[#7070A0] hover:text-[#CCCCEE] hover:bg-[#0F0F22]"
          )}
        >
          <LayoutDashboard style={{ width: 17, height: 17 }} />
          Dashboard
        </NavLink>

        {/* Grouped module nav */}
        {(["core", "operations", "growth", "industry"] as const).map((cat) => {
          const mods = navModules.filter((m) => m.category === cat);
          if (mods.length === 0) return null;

          const catLabel: Record<string, string> = {
            core: "Modules",
            operations: "Operations",
            growth: "Growth",
            industry: "Industry",
          };

          return (
            <div key={cat} className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest px-2 mb-1.5" style={{ color: "#404060", letterSpacing: "0.1em" }}>
                {catLabel[cat]}
              </p>
              <ul className="space-y-0.5">
                {mods.map((mod) => {
                  const Icon = ICON_MAP[mod.iconName] || Package;
                  return (
                    <li key={mod.key}>
                      <NavLink
                        to={mod.href}
                        className={({ isActive }) => cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150",
                          isActive
                            ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20"
                            : "text-[#7070A0] hover:text-[#CCCCEE] hover:bg-[#0F0F22]"
                        )}
                      >
                        <Icon style={{ width: 17, height: 17, flexShrink: 0 }} />
                        <span className="truncate">{mod.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Bottom links */}
      <div className="flex-shrink-0 px-2.5 pb-4" style={{ borderTop: "1px solid #151528", paddingTop: 10 }}>
        <NavLink
          to="/admin/dashboard"
          className={({ isActive }) => cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 mb-0.5",
            isActive ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20" : "text-[#7070A0] hover:text-[#CCCCEE] hover:bg-[#0F0F22]"
          )}
        >
          <LayoutGrid style={{ width: 17, height: 17 }} />
          Admin Panel
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) => cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 mb-0.5",
            isActive ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20" : "text-[#7070A0] hover:text-[#CCCCEE] hover:bg-[#0F0F22]"
          )}
        >
          <Settings style={{ width: 17, height: 17 }} />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
