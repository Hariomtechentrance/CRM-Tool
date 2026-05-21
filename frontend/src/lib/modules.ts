// Central registry of all FlowCRM modules.
// The `key` is stored in enabledModules[] in the DB.

export interface ModuleDefinition {
  key: string;
  label: string;
  description: string;
  href: string;
  category: "core" | "operations" | "growth" | "industry";
  iconName: string;        // lucide icon name (used as label for dynamic import)
  accentColor: string;     // CSS color for icon
  accentBg: string;        // rgba bg
  accentBorder: string;    // rgba border
  defaultFor: string[];    // businessType values that pre-select this module
}

export const ALL_MODULES: ModuleDefinition[] = [
  // ── CORE ──────────────────────────────────────────────────────
  {
    key: "CRM",
    label: "CRM & Contacts",
    description: "Manage customers, suppliers, contacts and communication history.",
    href: "/crm",
    category: "core",
    iconName: "Users",
    accentColor: "#818CF8",
    accentBg: "rgba(99,102,241,0.12)",
    accentBorder: "rgba(99,102,241,0.25)",
    defaultFor: ["IMPORT","EXPORT","IMPORT_EXPORT","TRADING","MANUFACTURING","RETAIL","ECOMMERCE","IT_SOFTWARE","IT_SERVICES","HEALTHCARE","EDUCATION","REAL_ESTATE","FOOD_BEVERAGE","LOGISTICS","FINANCE","CONSULTING","MEDIA","AGRICULTURE","HOSPITALITY","LEGAL","NGO","OTHER"],
  },
  {
    key: "INVENTORY",
    label: "Inventory & Stock",
    description: "Products, stock levels, categories, units and reorder alerts.",
    href: "/inventory",
    category: "core",
    iconName: "Package",
    accentColor: "#34D399",
    accentBg: "rgba(16,185,129,0.1)",
    accentBorder: "rgba(16,185,129,0.2)",
    defaultFor: ["IMPORT","EXPORT","IMPORT_EXPORT","TRADING","MANUFACTURING","RETAIL","ECOMMERCE","FOOD_BEVERAGE","LOGISTICS","AGRICULTURE"],
  },
  {
    key: "PURCHASE",
    label: "Purchase & Procurement",
    description: "Purchase orders, vendor management and goods receipt notes.",
    href: "/purchase",
    category: "core",
    iconName: "ShoppingCart",
    accentColor: "#C084FC",
    accentBg: "rgba(139,92,246,0.12)",
    accentBorder: "rgba(139,92,246,0.25)",
    defaultFor: ["TRADING","MANUFACTURING","RETAIL","FOOD_BEVERAGE","AGRICULTURE","LOGISTICS"],
  },
  {
    key: "STORE",
    label: "Store (Inward)",
    description: "Record incoming goods, GRN entries, material receipts and inward register.",
    href: "/store",
    category: "core",
    iconName: "PackageOpen",
    accentColor: "#34D399",
    accentBg: "rgba(16,185,129,0.1)",
    accentBorder: "rgba(16,185,129,0.2)",
    defaultFor: ["IMPORT","EXPORT","IMPORT_EXPORT","TRADING","MANUFACTURING","LOGISTICS","AGRICULTURE"],
  },
  {
    key: "DISPATCH",
    label: "Dispatch (Outward)",
    description: "Dispatch register, sales orders, shipments and delivery tracking.",
    href: "/dispatch",
    category: "core",
    iconName: "Truck",
    accentColor: "#FBBF24",
    accentBg: "rgba(245,158,11,0.1)",
    accentBorder: "rgba(245,158,11,0.2)",
    defaultFor: ["IMPORT","EXPORT","IMPORT_EXPORT","TRADING","LOGISTICS","AGRICULTURE"],
  },
  {
    key: "ACCOUNTS",
    label: "Accounts & Finance",
    description: "Invoices, payments, expense tracking, ledger and P&L reports.",
    href: "/accounts",
    category: "core",
    iconName: "Receipt",
    accentColor: "#F87171",
    accentBg: "rgba(239,68,68,0.08)",
    accentBorder: "rgba(239,68,68,0.2)",
    defaultFor: ["IMPORT","EXPORT","IMPORT_EXPORT","TRADING","MANUFACTURING","RETAIL","ECOMMERCE","IT_SOFTWARE","IT_SERVICES","HEALTHCARE","EDUCATION","REAL_ESTATE","FOOD_BEVERAGE","LOGISTICS","FINANCE","CONSULTING","MEDIA","AGRICULTURE","HOSPITALITY","LEGAL","NGO","OTHER"],
  },
  // ── OPERATIONS ────────────────────────────────────────────────
  {
    key: "POS",
    label: "Point of Sale",
    description: "Retail shop billing, cash register, daily sales and receipts.",
    href: "/pos",
    category: "operations",
    iconName: "ShoppingBag",
    accentColor: "#34D399",
    accentBg: "rgba(16,185,129,0.1)",
    accentBorder: "rgba(16,185,129,0.2)",
    defaultFor: ["RETAIL","FOOD_BEVERAGE","HOSPITALITY"],
  },
  {
    key: "WAREHOUSE",
    label: "Warehouse Management",
    description: "Multi-location stock, bin management, transfers and audits.",
    href: "/warehouse",
    category: "operations",
    iconName: "Warehouse",
    accentColor: "#FBBF24",
    accentBg: "rgba(245,158,11,0.1)",
    accentBorder: "rgba(245,158,11,0.2)",
    defaultFor: ["MANUFACTURING","TRADING","LOGISTICS","IMPORT","EXPORT","IMPORT_EXPORT"],
  },
  {
    key: "HR",
    label: "HR & Payroll",
    description: "Employee records, attendance tracking and salary processing.",
    href: "/hr",
    category: "operations",
    iconName: "UserCheck",
    accentColor: "#818CF8",
    accentBg: "rgba(99,102,241,0.12)",
    accentBorder: "rgba(99,102,241,0.25)",
    defaultFor: ["MANUFACTURING","IT_SOFTWARE","IT_SERVICES","HEALTHCARE","EDUCATION","FOOD_BEVERAGE","HOSPITALITY","CONSULTING","MEDIA","NGO","LEGAL"],
  },
  {
    key: "PROJECTS",
    label: "Projects & Tasks",
    description: "Project management, task assignments, deadlines and progress.",
    href: "/projects",
    category: "operations",
    iconName: "Kanban",
    accentColor: "#C084FC",
    accentBg: "rgba(139,92,246,0.12)",
    accentBorder: "rgba(139,92,246,0.25)",
    defaultFor: ["IT_SOFTWARE","IT_SERVICES","REAL_ESTATE","CONSULTING","MEDIA","EDUCATION","NGO","LEGAL"],
  },
  // ── GROWTH ────────────────────────────────────────────────────
  {
    key: "MARKETING",
    label: "Leads & Marketing",
    description: "Lead pipeline, follow-up reminders and email campaign tracking.",
    href: "/marketing",
    category: "growth",
    iconName: "Megaphone",
    accentColor: "#F87171",
    accentBg: "rgba(239,68,68,0.08)",
    accentBorder: "rgba(239,68,68,0.2)",
    defaultFor: ["IT_SOFTWARE","IT_SERVICES","REAL_ESTATE","CONSULTING","MEDIA","ECOMMERCE","HOSPITALITY"],
  },
  {
    key: "SUPPORT",
    label: "Customer Support",
    description: "Helpdesk tickets, SLA tracking and customer issue resolution.",
    href: "/support",
    category: "growth",
    iconName: "HeadphonesIcon",
    accentColor: "#34D399",
    accentBg: "rgba(16,185,129,0.1)",
    accentBorder: "rgba(16,185,129,0.2)",
    defaultFor: ["IT_SOFTWARE","IT_SERVICES","ECOMMERCE","HEALTHCARE","HOSPITALITY","FINANCE"],
  },
  {
    key: "ECOMMERCE",
    label: "E-commerce",
    description: "Connect Shopify, WooCommerce and sync online orders automatically.",
    href: "/ecommerce",
    category: "growth",
    iconName: "Globe",
    accentColor: "#FBBF24",
    accentBg: "rgba(245,158,11,0.1)",
    accentBorder: "rgba(245,158,11,0.2)",
    defaultFor: ["ECOMMERCE","RETAIL"],
  },
  {
    key: "REPORTS",
    label: "Reports & Analytics",
    description: "Custom dashboards, financial reports and export to Excel/PDF.",
    href: "/reports",
    category: "growth",
    iconName: "BarChart3",
    accentColor: "#818CF8",
    accentBg: "rgba(99,102,241,0.12)",
    accentBorder: "rgba(99,102,241,0.25)",
    defaultFor: ["IMPORT","EXPORT","IMPORT_EXPORT","TRADING","MANUFACTURING","RETAIL","ECOMMERCE","IT_SOFTWARE","IT_SERVICES","HEALTHCARE","FINANCE","CONSULTING","AGRICULTURE","LOGISTICS"],
  },
  // ── INDUSTRY SPECIFIC ─────────────────────────────────────────
  {
    key: "IMPORT_EXPORT_SUITE",
    label: "Import/Export Suite",
    description: "Letter of Credit, custom docs, IEC management, Incoterms and HS codes.",
    href: "/import-export",
    category: "industry",
    iconName: "Container",
    accentColor: "#34D399",
    accentBg: "rgba(16,185,129,0.1)",
    accentBorder: "rgba(16,185,129,0.2)",
    defaultFor: ["IMPORT","EXPORT","IMPORT_EXPORT"],
  },
  {
    key: "RETAIL_FASHION",
    label: "Retail & Fashion",
    description: "Size/color variants, collections, boutique POS, returns and style tracking.",
    href: "/retail",
    category: "industry",
    iconName: "Shirt",
    accentColor: "#C084FC",
    accentBg: "rgba(139,92,246,0.12)",
    accentBorder: "rgba(139,92,246,0.25)",
    defaultFor: ["RETAIL","ECOMMERCE"],
  },
];

export const MODULE_CATEGORIES = [
  { key: "core",      label: "Core Business",       desc: "Essential modules for day-to-day operations" },
  { key: "operations", label: "Operations",          desc: "Advanced operational management" },
  { key: "growth",    label: "Growth & Support",     desc: "Scale your business and serve customers better" },
  { key: "industry",  label: "Industry Specific",    desc: "Tailored for your business type" },
] as const;

// Returns the default modules for a given businessType
export function getDefaultModules(businessType: string): string[] {
  return ALL_MODULES
    .filter((m) => m.defaultFor.includes(businessType))
    .map((m) => m.key);
}

// Sidebar nav items for enabled modules (always includes Dashboard)
export function getNavModules(enabledModules: string[]): ModuleDefinition[] {
  if (!enabledModules || enabledModules.length === 0) return ALL_MODULES;
  return ALL_MODULES.filter((m) => enabledModules.includes(m.key));
}
