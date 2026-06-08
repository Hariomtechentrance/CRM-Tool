import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Settings, ChevronDown, Building2,
  Users, Package, ShoppingCart, Truck, Receipt,
  ShoppingBag, Warehouse, UserCheck, Kanban,
  Megaphone, Headphones, Globe, BarChart3, Container, Shirt,
  LayoutGrid, PackageOpen, Mail, Calendar, Briefcase, FileText, ShieldCheck, RefreshCw, IndianRupee, Layers, Copy, Stamp, PiggyBank, Cog, DollarSign, Landmark, Webhook,
  MonitorCheck, ClipboardList, UserCog, KanbanSquare, Zap, CalendarClock, MessageCircle, ShieldAlert,
  Phone, TrendingUp, Heart, Sliders, Palette, Scale,
  UtensilsCrossed, Hotel,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { getNavModules } from "@/lib/modules";
import type { OrganizationSummary } from "@/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const ICON_MAP: Record<string, React.ElementType> = {
  Users, Package, ShoppingCart, Truck, Receipt,
  ShoppingBag, Warehouse, UserCheck, Kanban,
  Megaphone, Headphones, Globe, BarChart3, Container, Shirt,
  PackageOpen,
  HeadphonesIcon: Headphones,
};

const MOD_I18N_KEY: Record<string, string> = {
  CRM: "mod_crm",
  INVENTORY: "mod_inventory",
  PURCHASE: "mod_purchase",
  STORE: "mod_store",
  DISPATCH: "mod_dispatch",
  ACCOUNTS: "mod_accounts",
  POS: "mod_pos",
  WAREHOUSE: "mod_warehouse",
  HR: "mod_hr",
  PROJECTS: "mod_projects",
  MARKETING: "mod_marketing",
  SUPPORT: "mod_support",
  ECOMMERCE: "mod_ecommerce",
  REPORTS: "mod_reports",
  IMPORT_EXPORT_SUITE: "mod_import_export",
  RETAIL_FASHION: "mod_retail",
};

function OrgSwitcherDropdown() {
  const { organizations, activeOrg, setActiveOrg } = useAuthStore();
  const { t } = useTranslation();
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
              className={cn("w-full flex items-center gap-3 px-3 py-2 transition-colors cursor-pointer rounded-lg", activeOrg.id === org.id ? "bg-indigo-600/10" : "hover:bg-[var(--bg-hover)]")}
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
              <span className="text-xs font-medium">{t("nav_add_org")}</span>
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
    <div style={{ marginBottom: 2 }}>
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
  const { moduleAccess, activeOrg } = useAuthStore();
  const isOrgAdmin = activeOrg?.role === "OWNER" || activeOrg?.role === "ADMIN";
  const navModules = getNavModules(moduleAccess);
  const { t } = useTranslation();

  const canSee = (key: string) => isOrgAdmin || moduleAccess.includes(key);

  // Visibility rules for each section
  const showIT       = isOrgAdmin || canSee("PROJECTS");
  const showSales    = isOrgAdmin || canSee("DISPATCH") || canSee("CRM") || canSee("MARKETING");
  const showFinance  = isOrgAdmin || canSee("ACCOUNTS");
  const showAdmin    = isOrgAdmin;

  const navLinkClass = ({ isActive }: { isActive: boolean }) => cn(
    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium transition-all duration-150",
    isActive
      ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20"
      : "nav-link-inactive"
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

      {/* ── Scrollable area: everything ── */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "0 10px 8px" }}>

        {/* Dashboard */}
        <div style={{ marginBottom: 8 }}>
          <p className="text-[10px] font-bold uppercase tracking-widest px-2 mb-1"
            style={{ color: "var(--text-ghost)", letterSpacing: "0.1em" }}>
            {t("nav_overview")}
          </p>
          <NavLink to="/dashboard" end onClick={onClose} className={navLinkClass}>
            <LayoutDashboard style={{ width: 15, height: 15, flexShrink: 0 }} />
            {t("nav_dashboard")}
          </NavLink>
        </div>

        {/* ── Modules — static 2-col grid, only selected modules ── */}
        {navModules.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <p className="text-[10px] font-bold uppercase tracking-widest px-2 mb-2"
              style={{ color: "var(--text-ghost)", letterSpacing: "0.1em" }}>
              {t("nav_modules")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
              {navModules.map((mod) => {
                const Icon = ICON_MAP[mod.iconName] || Package;
                const i18nKey = MOD_I18N_KEY[mod.key];
                const label = i18nKey ? t(i18nKey) : mod.label;
                return (
                  <NavLink
                    key={mod.key}
                    to={mod.href}
                    onClick={onClose}
                    className={({ isActive }) => cn(
                      "flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-center transition-all duration-150",
                      isActive
                        ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20"
                        : "nav-mod-inactive"
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

        {/* Divider after modules */}
        <div style={{ height: 1, background: "var(--border)", margin: "4px 0 8px" }} />

        {/* ── Communication — always visible ── */}
        <CollapsibleSection label={t("nav_communication")}>
          {[
            { href: "/email",        tKey: "nav_email",        Icon: Mail },
            { href: "/activities",   tKey: "nav_activities",   Icon: Calendar },
            { href: "/appointments", tKey: "nav_appointments", Icon: CalendarClock },
            { href: "/automations",  tKey: "nav_automations",  Icon: Zap },
            { href: "/whatsapp",     tKey: "nav_whatsapp",     Icon: MessageCircle },
            { href: "/lead-forms",   tKey: "nav_lead_forms",   Icon: FileText },
          ].map(({ href, tKey, Icon }) => (
            <NavLink key={href} to={href} onClick={onClose} className={navLinkClass}>
              <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span className="truncate">{t(tKey)}</span>
            </NavLink>
          ))}
        </CollapsibleSection>

        {/* ── IT & Projects — only if has PROJECTS access ── */}
        {showIT && (
          <CollapsibleSection label={t("nav_it_section")}>
            {[
              { href: "/it-projects",    tKey: "nav_it_projects",    Icon: MonitorCheck },
              { href: "/sprint-board",   tKey: "nav_sprint_board",   Icon: KanbanSquare },
              { href: "/bugs",           tKey: "nav_bug_tracker",    Icon: ShieldAlert },
              { href: "/time-tracking",  tKey: "nav_time_tracking",  Icon: ClipboardList },
              { href: "/my-work",        tKey: "nav_my_work",        Icon: ClipboardList },
              { href: "/team-dashboard", tKey: "nav_team_dashboard", Icon: UserCog },
            ].map(({ href, tKey, Icon }) => (
              <NavLink key={href} to={href} onClick={onClose} className={navLinkClass}>
                <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span className="truncate">{t(tKey)}</span>
              </NavLink>
            ))}
          </CollapsibleSection>
        )}

        {/* ── Sales — only if has CRM / Dispatch / Marketing access ── */}
        {showSales && (
          <CollapsibleSection label={t("nav_sales_section")}>
            {[
              { href: "/deals",      tKey: "nav_deals",      Icon: Briefcase },
              { href: "/quotations", tKey: "nav_quotations", Icon: FileText },
              { href: "/recurring",  tKey: "nav_recurring",  Icon: RefreshCw },
              { href: "/batches",    tKey: "nav_batch",      Icon: Layers },
              { href: "/bom",        tKey: "nav_bom",        Icon: Cog },
            ].map(({ href, tKey, Icon }) => (
              <NavLink key={href} to={href} onClick={onClose} className={navLinkClass}>
                <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span className="truncate">{t(tKey)}</span>
              </NavLink>
            ))}
          </CollapsibleSection>
        )}

        {/* ── Finance & Tax — only if has Accounts access ── */}
        {showFinance && (
          <CollapsibleSection label={t("nav_finance_section")}>
            {[
              { href: "/gst",            tKey: "nav_gst",            Icon: IndianRupee },
              { href: "/einvoice",       tKey: "nav_einvoice",       Icon: Stamp },
              { href: "/ewaybill",       tKey: "nav_ewaybill",       Icon: Truck },
              { href: "/tds",            tKey: "nav_tds",            Icon: Receipt },
              { href: "/budgets",        tKey: "nav_budgets",        Icon: PiggyBank },
              { href: "/reconciliation", tKey: "nav_reconciliation", Icon: Landmark },
              { href: "/duplicates",     tKey: "nav_duplicates",     Icon: Copy },
            ].map(({ href, tKey, Icon }) => (
              <NavLink key={href} to={href} onClick={onClose} className={navLinkClass}>
                <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span className="truncate">{t(tKey)}</span>
              </NavLink>
            ))}
          </CollapsibleSection>
        )}

        {/* ── Admin & Tools — only for OWNER / ADMIN ── */}
        {showAdmin && (
          <CollapsibleSection label={t("nav_admin_section")}>
            {[
              { href: "/admin/dashboard", tKey: "nav_admin",       Icon: LayoutGrid },
              { href: "/audit",           tKey: "nav_audit",       Icon: ShieldCheck },
              { href: "/currency",        tKey: "nav_currency",    Icon: DollarSign },
              { href: "/webhooks",        tKey: "nav_webhooks",    Icon: Webhook },
              { href: "/security",        tKey: "nav_security",    Icon: ShieldAlert },
              { href: "/custom-fields",   tKey: "nav_custom_fields", Icon: Sliders },
              { href: "/branding",        tKey: "nav_branding",    Icon: Palette },
              { href: "/compliance",      tKey: "nav_compliance",  Icon: Scale },
            ].map(({ href, tKey, Icon }) => (
              <NavLink key={href} to={href} onClick={onClose} className={navLinkClass}>
                <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span className="truncate">{t(tKey)}</span>
              </NavLink>
            ))}
          </CollapsibleSection>
        )}

        {/* ── Industry Verticals ── */}
        <CollapsibleSection label="Industry Verticals">
          {[
            { href: "/telecalling",  label: "Tele-calling",  Icon: Phone },
            { href: "/services",     label: "Services",      Icon: Briefcase },
            { href: "/stock-market", label: "Stock Market",  Icon: TrendingUp },
            { href: "/health",       label: "Health",        Icon: Heart },
          ].map(({ href, label, Icon }) => (
            <NavLink key={href} to={href} onClick={onClose} className={navLinkClass}>
              <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </CollapsibleSection>

        {/* ── Food & Hospitality ── */}
        <CollapsibleSection label="Food & Hospitality">
          {[
            { href: "/restaurant", label: "Restaurant POS",     Icon: UtensilsCrossed },
            { href: "/hotel",      label: "Hotel / Resort",     Icon: Hotel },
          ].map(({ href, label, Icon }) => (
            <NavLink key={href} to={href} onClick={onClose} className={navLinkClass}>
              <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </CollapsibleSection>

        {/* Settings — always visible */}
        <div style={{ marginTop: 4 }}>
          <NavLink to="/settings" onClick={onClose} className={navLinkClass}>
            <Settings style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span className="truncate">{t("nav_settings")}</span>
          </NavLink>
        </div>

      </div>

      {/* ── Fixed bottom: language switcher only ── */}
      <div className="flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
        <LanguageSwitcher />
      </div>
    </aside>
  );
}
