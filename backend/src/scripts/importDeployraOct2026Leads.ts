// One-off import of 4 scraped lead sheets (Google Maps business listings)
// downloaded 2026-10-29 into Deployra Private Limited's CRM/Leads.
//
// These sheets have no Email column anywhere, and only one has a (mostly
// empty) Website column — real scraped data never carries those, which is
// why the Deployra bulk-import mandatory-field rule was relaxed to just
// Name + Contact (see leads.controller.ts bulkImportLeads) before this
// script was written. Leads are created UNASSIGNED on purpose — they're the
// "fresh/raw" pool Sales/Admin/Manager claims from (see Part 2 of the plan).
//
// Usage:
//   npx ts-node-dev --transpile-only src/scripts/importDeployraOct2026Leads.ts            (dry run, default)
//   npx ts-node-dev --transpile-only src/scripts/importDeployraOct2026Leads.ts --commit    (actually writes)

import * as path from "path";
import * as crypto from "crypto";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const db = () => (prisma as any);

const ORG_SLUG = "deployra-private-limited";
const DOWNLOADS = path.join(require("os").homedir(), "Downloads");
const COMMIT = process.argv.includes("--commit");

type Row = Record<string, any>;

// Only a handful of 10-digit Indian mobile numbers are actually usable;
// "Not in results" / blank cells are the norm in Google Maps scrapes.
function normalizePhone(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  if (last10.length === 10 && /^[6-9]/.test(last10)) return last10;
  return undefined;
}

function up(s?: string | null): string | undefined {
  const t = (s ?? "").toString().trim();
  return t || undefined;
}

function buildNotes(fields: Record<string, string | number | undefined>): string | undefined {
  const lines: string[] = [];
  for (const [label, v] of Object.entries(fields)) {
    if (v === undefined || v === null || v === "") continue;
    lines.push(`${label}: ${v}`);
  }
  return lines.length ? lines.join("\n") : undefined;
}

interface ParsedLead {
  name: string;
  phone?: string;
  industry?: string;
  city?: string;
  website?: string;
  notes?: string;
}

// clinic_hospital_leads_bangalore.xlsx — flat sheet, Category -> Domain.
function parseClinicHospital(): ParsedLead[] {
  const wb = XLSX.readFile(path.join(DOWNLOADS, "clinic_hospital_leads_bangalore.xlsx"));
  const ws = wb.Sheets["Clinic & Hospital Leads"];
  const rows: Row[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return rows
    .map((r): ParsedLead | null => {
      const name = up(r["Name"]);
      if (!name) return null;
      return {
        name,
        phone: normalizePhone(String(r["Phone"] ?? "")),
        industry: up(r["Category"]),
        city: up(r["Area"]),
        notes: buildNotes({
          Address: r["Address"], Rating: r["Rating"], Reviews: r["Reviews"],
          "Opening Hours": r["Opening Hours"], "Maps Link": r["Google Maps Link"],
        }),
      };
    })
    .filter((r): r is ParsedLead => r !== null);
}

// salon_leads_bangalore.xlsx (has Website) and salon_leads_bangalore_master.xlsx
// (no Website) — same flat shape otherwise, Type -> Domain.
function parseSalonFile(filename: string, hasWebsite: boolean): ParsedLead[] {
  const wb = XLSX.readFile(path.join(DOWNLOADS, filename));
  const ws = wb.Sheets["Salon Leads"];
  const rows: Row[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return rows
    .map((r): ParsedLead | null => {
      const name = up(r["Business Name"] ?? r["Name"]);
      if (!name) return null;
      const website = hasWebsite ? up(r["Website"]) : undefined;
      return {
        name,
        phone: normalizePhone(String(r["Phone"] ?? "")),
        industry: up(r["Type"]),
        city: up(r["Area"]),
        website: website && website.toLowerCase() !== "not listed in results" ? website : undefined,
        notes: buildNotes({
          Address: r["Address"], Rating: r["Rating"], Reviews: r["Reviews"],
          "Opening Hours": r["Opening Hours"], "Maps Link": r["Google Maps Link"],
        }),
      };
    })
    .filter((r): r is ParsedLead => r !== null);
}

// metro_city_leads_india.xlsx — each city sheet is several stacked sections
// (Used cars / Two-wheelers / Salons / ...), each with its own repeated
// "# | Domain | Area | Name | Category | Address | Phone | Rating | Reviews
// | Opening Hours | Google Maps Link" header row. Scan for that header row
// (col 0 === "#") and read subsequent rows by position until the next one.
function parseMetroCityFile(): ParsedLead[] {
  const wb = XLSX.readFile(path.join(DOWNLOADS, "metro_city_leads_india.xlsx"));
  const out: ParsedLead[] = [];
  const CITY_SHEETS = ["Bengaluru", "Mumbai", "Delhi", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad"];
  for (const sheetName of CITY_SHEETS) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    let cols: string[] | null = null;
    for (const row of rows) {
      if (String(row[0]).trim() === "#" && String(row[1]).trim().toLowerCase() === "domain") {
        cols = row.map((c: any) => String(c).trim());
        continue;
      }
      if (!cols) continue; // before the first header row in this sheet
      if (row.every(c => String(c).trim() === "")) continue; // blank spacer row
      if (String(row[0]).trim() === "#") continue; // a later header row, already captured above
      const get = (label: string) => {
        const idx = cols!.indexOf(label);
        return idx === -1 ? "" : row[idx];
      };
      const name = up(get("Name"));
      if (!name) continue;
      out.push({
        name,
        phone: normalizePhone(String(get("Phone") ?? "")),
        industry: up(get("Domain")),
        city: up(get("Area")),
        notes: buildNotes({
          City: sheetName, Address: get("Address"), Category: get("Category"),
          Rating: get("Rating"), Reviews: get("Reviews"),
          "Opening Hours": get("Opening Hours"), "Maps Link": get("Google Maps Link"),
        }),
      });
    }
  }
  return out;
}

async function main() {
  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error(`Organization with slug "${ORG_SLUG}" not found — refusing to guess which org this import belongs to.`);

  const sources: { file: string; leads: ParsedLead[] }[] = [
    { file: "clinic_hospital_leads_bangalore.xlsx", leads: parseClinicHospital() },
    { file: "salon_leads_bangalore.xlsx", leads: parseSalonFile("salon_leads_bangalore.xlsx", true) },
    { file: "salon_leads_bangalore_master.xlsx", leads: parseSalonFile("salon_leads_bangalore_master.xlsx", false) },
    { file: "metro_city_leads_india.xlsx", leads: parseMetroCityFile() },
  ];

  const existingPhones = new Set(
    (await db().lead.findMany({ where: { organizationId: org.id, phone: { not: null } }, select: { phone: true } }))
      .map((l: { phone: string }) => l.phone),
  );

  const toCreate: any[] = [];
  const seenPhonesThisRun = new Set<string>();
  const perFile: Record<string, { rows: number; missingPhone: number; duplicate: number; created: number }> = {};

  for (const { file, leads } of sources) {
    const stat = { rows: leads.length, missingPhone: 0, duplicate: 0, created: 0 };
    for (const lead of leads) {
      if (!lead.phone) { stat.missingPhone++; continue; }
      if (existingPhones.has(lead.phone) || seenPhonesThisRun.has(lead.phone)) { stat.duplicate++; continue; }
      seenPhonesThisRun.add(lead.phone);
      stat.created++;
      toCreate.push({
        id: crypto.randomUUID().replace(/-/g, "").substring(0, 25),
        organizationId: org.id,
        name: lead.name,
        phone: lead.phone,
        industry: lead.industry,
        city: lead.city,
        website: lead.website,
        notes: lead.notes,
        source: "OTHER",
        status: "NEW",
      });
    }
    perFile[file] = stat;
  }

  console.log(`Org: ${org.name} (${org.id})${COMMIT ? "" : " [DRY RUN]"}`);
  console.table(perFile);
  console.log("TOTAL to create:", toCreate.length);

  if (COMMIT && toCreate.length > 0) {
    const batchSize = 500;
    for (let i = 0; i < toCreate.length; i += batchSize) {
      await db().lead.createMany({ data: toCreate.slice(i, i + batchSize), skipDuplicates: true });
    }
    console.log("Committed.");
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
