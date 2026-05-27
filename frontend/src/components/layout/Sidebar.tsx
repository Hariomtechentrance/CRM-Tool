import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Settings, ChevronDown, Building2,
  Users, Package, ShoppingCart, Truck, Receipt,
  ShoppingBag, Warehouse, UserCheck, Kanban,
  Megaphone, Headphones, Globe, BarChart3, Container, Shirt,
  LayoutGrid, PackageOpen, Mail, Calendar, Briefcase, FileText, ShieldCheck, RefreshCw,
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

// Short display labels for module grid cells
const MOD_SHORT: Record<string, string> = {
  CRM: "CRM",
  INVENTORY: "Inventory",
  PURCHASE: "Purchase",
  STORE: "Store",
  DISPATCH: "Dispatch",
  ACCOUNTS: "Accounts",
  POS: "POS",
  WAREHOUSE: "Warehouse",
  HR: "HR",
  PROJECTS: "Projects",
  MARKETING: "Marketing",
  SUPPORT: "Support",
  ECOMMERCE: "E-commerce",
  REPORTS: "Reports",
  IMPORT_EXPORT_SUITE: "Import/Export",
  RETAIL_FASHION: "Retail",
};

function OrgSwitcherDropdown() {
  const { organizations, activeOrg, setActiveOrg } = useAuthStore();
  const [open, setOpen] = useState(false);
  if (!activeOrg) return null;

  return (
    <div style={{ position: "relative", padding: "0 10px", marginBottom: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer"
        style={{ background: "var(--bg-hover)", border: "1px solid var(--border-input)" }}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          {getInitials(activeOrg.name)}
        </div>
        <div className="flex-1 text-left overflow-hidden min-w-0">
          <p className="text-sm font-semibold truncate leading-tight" style={{ color: "var(--text-primary)" }}>{activeOrg.name}</p>
          <p className="text-[10px] truncate" style={{ color: "var(--text-ghost)" }}>{activeOrg.role}</p>
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200", open && "rotate-180")} style={{ color: "var(--text-ghost)" }} />
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full mt-1 rounded-xl py-1.5 z-50"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 20px 60px var(--shadow)" }}>
          {organizations.map((org: OrganizationSummary) => (
            <button
              key={org.id}
              onClick={() => { setActiveOrg(org); setOpen(false); }}
              className={cn("w-full flex items-center gap-3 px-3 py-2 transition-colors cursor-pointer", activeOrg.id === org.id ? "bg-indigo-600/10" : "hover:bg-[#131327]")}
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                {getInitials(org.name)}
              </div>
              <div className="flex-1 text-left overflow-hidden min-w-0">
                <p className="text-xs truncate font-medium" style={{ color: "var(--text-primary)" }}>{org.name}</p>
                <p className="text-[10px]" style={{ color: "var(--text-ghost)" }}>{org.role}</p>
              </div>
              {activeOrg.id === org.id && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#6366f1" }} />}
            </button>
          ))}
          <div style={{ borderTop: "1px solid var(--border)" }} className="mt-1 pt-1">
            <NavLink
              to="/create-org"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2 transition-colors"
              style={{ color: "#818CF8" }}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Add new organization</span>
            </NavLink>
          </div>
        </div>
      )}
    </div>
  );
}

interface CollapsibleSectionProps {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ label, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ padding: "0 10px", marginBottom: 2 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 8px", borderRadius: 8, background: "none", border: "none", cursor: "pointer",
          color: "var(--text-ghost)",
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
        <ChevronDown
          style={{
            width: 12, height: 12, color: "var(--text-ghost)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>
      {open && <div style={{ marginTop: 2 }}>{children}</div>}
    </div>
  );
}

interface SidebarProps { open?: boolean; onClose?: () => void; }

export default function Sidebar({ open = false, onClose }: SidebarProps) {
  const { moduleAccess } = useAuthStore();
  const navModules = getNavModules(moduleAccess);

  const navLinkClass = ({ isActive }: { isActive: boolean }) => cn(
    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium transition-all duration-150",
    isActive
      ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20"
      : "text-[#7070A0] hover:text-[#CCCCEE] hover:bg-[#0F0F22]"
  );

  return (
    <aside
      className={`app-sidebar flex flex-col flex-shrink-0${open ? " sidebar-open" : ""}`}
      style={{ width: 232, height: "100vh", background: "var(--bg-card)", borderRight: "1px solid var(--border)" }}
    >
      {/* Logo */}
      <div className="flex items-center px-4 flex-shrink-0" style={{ height: 50, borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-lg flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            FC
          </div>
          <span className="font-bold text-sm tracking-tight" style={{ color: "var(--text-primary)" }}>FlowCRM</span>
        </div>
      </div>

      {/* Org switcher */}
      <div className="pt-3 flex-shrink-0">
        <OrgSwitcherDropdown />
      </div>

      {/* ── Scrollable middle: Dashboard + Modules ── */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "0 10px 4px" }}>

        {/* Dashboard */}
        <div style={{ marginBottom: 8 }}>
          <p className="text-[10px] font-bold uppercase tracking-widest px-2 mb-1" style={{ color: "var(--text-ghost)", letterSpacing: "0.1em" }}>Overview</p>
          <NavLink
            to="/dashboard"
            end
            onClick={onClose}
            className={navLinkClass}
          >
            <LayoutDashboard style={{ width: 15, height: 15, flexShrink: 0 }} />
            Dashboard
          </NavLink>
        </div>

        {/* Modules — 2-column compact grid */}
        {navModules.length > 0 && (
          <div style={{ marginBottom: 6 }}>
            <p className="text-[10px] font-bold uppercase tracking-widest px-2 mb-2" style={{ color: "var(--text-ghost)", letterSpacing: "0.1em" }}>
              Modules
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
              {navModules.map((mod) => {
                const Icon = ICON_MAP[mod.iconName] || Package;
                const label = MOD_SHORT[mod.key] || mod.label;
                return (
                  <NavLink
                    key={mod.key}
                    to={mod.href}
                    onClick={onClose}
                    className={({ isActive }) => cn(
                      "flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-center transition-all duration-150",
                      isActive
                        ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20"
                        : "text-[#7070A0] hover:text-[#CCCCEE] hover:bg-[#0F0F22] border border-transparent"
                    )}
                    style={{ textDecoration: "none" }}
                  >
                    <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1.2, wordBreak: "break-word" as const }}>{label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed bottom section ── */}
      <div className="flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>

        {/* Sales — collapsible */}
        <CollapsibleSection label="Sales">
          {[
            { href: "/deals", label: "Deals", Icon: Briefcase },
            { href: "/quotations", label: "Quotations", Icon: FileText },
            { href: "/recurring", label: "Recurring Invoices", Icon: RefreshCw },
          ].map(({ href, label, Icon }) => (
            <NavLink key={href} to={href} onClick={onClose} className={navLinkClass}>
              <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </CollapsibleSection>

        {/* Communication — collapsible */}
        <CollapsibleSection label="Communication">
          {[
            { href: "/email", label: "Email", Icon: Mail },
            { href: "/activities", label: "Activities", Icon: Calendar },
          ].map(({ href, label, Icon }) => (
            <NavLink key={href} to={href} onClick={onClose} className={navLinkClass}>
              <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </CollapsibleSection>

        {/* Settings row */}
        <div style={{ padding: "6px 10px 10px" }}>
          <NavLink to="/admin/dashboard" onClick={onClose} className={navLinkClass}>
            <LayoutGrid style={{ width: 14, height: 14 }} />
            <span className="truncate">Admin Panel</span>
          </NavLink>
          <NavLink to="/audit" onClick={onClose} className={navLinkClass}>
            <ShieldCheck style={{ width: 14, height: 14 }} />
            <span className="truncate">Audit Trail</span>
          </NavLink>
          <NavLink to="/settings" onClick={onClose} className={navLinkClass}>
            <Settings style={{ width: 14, height: 14 }} />
            <span className="truncate">Settings</span>
          </NavLink>
        </div>

      </div>
    </aside>
  );
}
