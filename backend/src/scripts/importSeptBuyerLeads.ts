// One-off import for the "All data .xlsx - Sept 2026 Inquiry sheet" buyer-leads
// CSV handed over by the client. Reads the CSV directly (no copy of the raw
// customer data is kept anywhere in this repo) and upserts by phone+name
// (scoped to this org + leadType=BUYER) rather than plain insert, because
// most of this sheet was already bulk-imported on 2026-09-11 under the old
// notes-flattening import path — re-running a plain create would either
// duplicate ~90 leads or skip them outright and lose the sheet's new "Lead
// Status" column and the extra ~3 weeks of daily call-log notes added since.
//
// For an EXISTING lead (matched by phone AND name — see findMatch below):
// only additive/non-destructive changes are made — append any day-notes not
// already present, upsert the new custom fields, update `status`/`source`
// only when the sheet gives a real value, and fill `interestedModel`/budget
// only if currently empty. Nothing already in the CRM is overwritten with
// blanks or stale data.
//
// For a NEW lead: a full CarLead row is created plus the same custom fields.
//
// Usage:
//   npx ts-node-dev --transpile-only src/scripts/importSeptBuyerLeads.ts            (dry run, default)
//   npx ts-node-dev --transpile-only src/scripts/importSeptBuyerLeads.ts --commit    (actually writes)
//
// CSV_PATH and ORG_SLUG below are specific to this one-off import.

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const db = () => (prisma as any);

const ORG_SLUG = "shreya-cars";
const CSV_PATH =
  process.env.SEPT_LEADS_CSV ||
  path.join(__dirname, "..", "..", "..", "All data .xlsx - Sept 2026 Inquery sheet.csv");
const COMMIT = process.argv.includes("--commit");

type Row = Record<string, string>;

// Minimal RFC4180 CSV parser (handles quoted fields with embedded commas,
// newlines, and "" escaped quotes) — avoids adding a new dependency for a
// one-off script, and avoids ever materializing the parsed PII as a
// repo-tracked file the way an intermediate JSON export would.
function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }

  const header = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(v => v.trim() !== ""))
    .map(r => {
      const obj: Row = {};
      header.forEach((h, idx) => { obj[h] = (r[idx] ?? "").trim(); });
      return obj;
    });
}

const STATUS_MAP: Record<string, string> = {
  HOT: "HOT", WARM: "WARM", COLD: "COLD", LOST: "LOST",
  URGENT: "URGENT", CONTACTED: "CONTACTED", NEW: "NEW",
  "NOT INTERESTED": "NOT_INTERESTED",
};

function up(s?: string | null): string | undefined {
  return s ? s.toUpperCase() : undefined;
}

function parseBudgetRange(raw: string): { min?: number; max?: number } {
  if (!raw) return {};
  const s = raw.toLowerCase().replace(/,/g, "");
  const isLac = /lac|lakh|\bl\b/.test(s);
  const mult = isLac ? 100000 : 1;
  const range = s.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (range) return { min: parseFloat(range[1]) * mult, max: parseFloat(range[2]) * mult };
  const single = s.match(/(\d+(?:\.\d+)?)/);
  if (single) { const v = parseFloat(single[1]) * mult; return { min: v, max: v }; }
  return {};
}

// "1".."31" headers are day-of-September call-log columns. Each non-blank
// cell becomes a "{day}: {text}" line, matching the format already present
// in notes from the 2026-09-11 import (so appending stays visually consistent).
const DAY_COLUMNS = Array.from({ length: 31 }, (_, i) => String(i + 1));

function dayNoteLines(row: Row): string[] {
  const lines: string[] = [];
  for (const day of DAY_COLUMNS) {
    const v = (row[day] || "").trim();
    if (v) lines.push(`${day}: ${v}`);
  }
  return lines;
}

// Extra sheet columns that don't map onto a real CarLead field — each becomes
// its own CAR_BUYER_LEAD custom field (label -> raw cell value), so nothing
// from the sheet is invisible after import.
const EXTRA_FIELD_COLUMNS: [string, string][] = [
  ["Location ", "City"],
  ["Year", "Year"],
  ["FUEL", "Fuel Type"],
  ["BOTH", "Transmission"],
  ["COLOR ", "Color"],
  ["Local/Any", "Local/Any"],
  ["Purchase plan ", "Purchase Plan"],
  ["C/F", "C/F"],
  ["Lead Status", "Lead Status"],
];

function fieldKeyFor(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

async function getOrCreateCustomField(orgId: string, entity: string, label: string, cache: Map<string, string>) {
  const fieldKey = fieldKeyFor(label);
  const cacheKey = `${entity}:${fieldKey}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;
  let field = await db().customField.findUnique({
    where: { organizationId_entity_fieldKey: { organizationId: orgId, entity, fieldKey } },
  });
  if (!field && COMMIT) {
    field = await db().customField.create({
      data: { organizationId: orgId, entity, label, fieldKey, fieldType: "TEXT" },
    });
  }
  const id = field?.id || `DRY_RUN:${cacheKey}`;
  cache.set(cacheKey, id);
  return id;
}

async function main() {
  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error(`Organization with slug "${ORG_SLUG}" not found — refusing to guess which org this import belongs to.`);

  if (!fs.existsSync(CSV_PATH)) throw new Error(`CSV not found at ${CSV_PATH} — set SEPT_LEADS_CSV to the correct path.`);
  const rows = parseCsv(fs.readFileSync(CSV_PATH, "utf-8"));
  console.log(`Loaded ${rows.length} rows from ${CSV_PATH} for org "${org.name}" (${org.id})${COMMIT ? "" : " [DRY RUN]"}`);

  const existing: { id: string; name: string; phone: string | null; notes: string | null; status: string; source: string; interestedModel: string | null; budgetMin: number | null; budgetMax: number | null }[] =
    await db().carLead.findMany({
      where: { organizationId: org.id, leadType: "BUYER" },
      select: { id: true, name: true, phone: true, notes: true, status: true, source: true, interestedModel: true, budgetMin: true, budgetMax: true },
    });
  type Rec = (typeof existing)[number];
  // 23 of the sheet's 25 duplicate phone numbers turn out to belong to
  // DIFFERENT people (shared/family numbers, dealer callback lines, etc.) —
  // only 2 are a genuine repeat of the same lead. So phone alone isn't a
  // reliable match key: group by phone, then require the name to also match
  // before treating it as the same lead. Different-name rows sharing a phone
  // become separate CarLead records, same as they are in the sheet.
  const byPhone = new Map<string, Rec[]>();
  for (const e of existing) {
    if (!e.phone) continue;
    const arr = byPhone.get(e.phone) || [];
    arr.push(e);
    byPhone.set(e.phone, arr);
  }
  // The sheet has one row with no phone number at all ("Jatan Wani") — fall
  // back to matching by name among phone-less leads so a repeat run of this
  // script doesn't create a second copy of it.
  const byNameNoPhone = new Map(existing.filter(e => !e.phone).map(e => [e.name.toUpperCase(), e]));

  function findMatch(phone: string | undefined, displayName: string): Rec | undefined {
    if (phone) return byPhone.get(phone)?.find(e => e.name.toUpperCase() === displayName);
    return byNameNoPhone.get(displayName);
  }

  const fieldCache = new Map<string, string>();
  const customValueOps: { customFieldId: string; entityId: string; value: string }[] = [];

  let created = 0, updated = 0, skipped = 0, notesAppended = 0;

  for (const row of rows) {
    const name = (row["Name"] || "").trim();
    const phone = (row["CONTACT"] || "").trim() || undefined;
    if (!name && !phone) { skipped++; continue; }
    const displayName = up(name) || `UNKNOWN - ${phone}`;

    const hotRaw = (row["HOT"] || "").trim().toUpperCase();
    const mappedStatus = STATUS_MAP[hotRaw];

    const sourceRaw = (row["SOURCE"] || "").trim().toUpperCase();
    const mappedSource = sourceRaw === "INSTA" || sourceRaw === "INSTAGRAM" ? "INSTAGRAM" : undefined;

    const interestedModel = up((row["Requirement "] || "").trim()) || undefined;
    const budget = parseBudgetRange((row["BUDGET"] || "").trim());
    const dayLines = dayNoteLines(row);

    const extras: { label: string; value: string }[] = [];
    for (const [col, label] of EXTRA_FIELD_COLUMNS) {
      let v = (row[col] || "").trim();
      if (label === "Lead Status" && v.toLowerCase() === "lead status") v = ""; // stray header-as-value typo in the sheet
      if (v) extras.push({ label, value: v });
    }

    const match = findMatch(phone, displayName);

    if (match) {
      // --- existing lead: additive update only ---
      const existingNotes = match.notes || "";
      const newLines = dayLines.filter(l => !existingNotes.includes(l));
      const mergedNotes = newLines.length ? [existingNotes, ...newLines].filter(Boolean).join("\n") : existingNotes;

      const data: Record<string, unknown> = {};
      if (newLines.length) { data.notes = mergedNotes; notesAppended += newLines.length; }
      if (mappedStatus && mappedStatus !== match.status) data.status = mappedStatus;
      if (mappedSource && match.source === "OTHER") data.source = mappedSource;
      if (!match.interestedModel && interestedModel) data.interestedModel = interestedModel;
      if (match.budgetMin == null && budget.min != null) data.budgetMin = budget.min;
      if (match.budgetMax == null && budget.max != null) data.budgetMax = budget.max;

      if (Object.keys(data).length > 0) {
        updated++;
        if (process.env.DEBUG_IMPORT) console.log("UPDATE", match.id, name, JSON.stringify(data));
        if (COMMIT) await db().carLead.update({ where: { id: match.id }, data });
        // Keep the in-memory record current — the sheet has ~25 duplicate
        // phone numbers, so a later row for the same phone in this same run
        // must see this row's merged notes/status, not the stale pre-loop value.
        Object.assign(match, data);
      }

      for (const { label, value } of extras) {
        const fieldId = await getOrCreateCustomField(org.id, "CAR_BUYER_LEAD", label, fieldCache);
        customValueOps.push({ customFieldId: fieldId, entityId: match.id, value });
      }
    } else {
      // --- new lead ---
      const id = crypto.randomUUID().replace(/-/g, "").substring(0, 25);
      const notes = dayLines.join("\n") || undefined;

      created++;
      if (COMMIT) {
        await db().carLead.create({
          data: {
            id,
            organizationId: org.id,
            leadType: "BUYER",
            name: displayName,
            phone,
            interestedModel,
            budgetMin: budget.min,
            budgetMax: budget.max,
            source: mappedSource || "OTHER",
            status: mappedStatus || "NEW",
            notes,
          },
        });
      }
      const record: Rec = { id, name: displayName, phone: phone || null, notes: notes || null, status: mappedStatus || "NEW", source: mappedSource || "OTHER", interestedModel: interestedModel || null, budgetMin: budget.min ?? null, budgetMax: budget.max ?? null };
      if (phone) {
        const arr = byPhone.get(phone) || [];
        arr.push(record);
        byPhone.set(phone, arr);
      } else byNameNoPhone.set(displayName, record);

      for (const { label, value } of extras) {
        const fieldId = await getOrCreateCustomField(org.id, "CAR_BUYER_LEAD", label, fieldCache);
        customValueOps.push({ customFieldId: fieldId, entityId: id, value });
      }
    }
  }

  if (COMMIT && customValueOps.length > 0) {
    for (const op of customValueOps) {
      await db().customFieldValue.upsert({
        where: { customFieldId_entityId: { customFieldId: op.customFieldId, entityId: op.entityId } },
        create: op,
        update: { value: op.value },
      });
    }
  }

  console.log({
    created,
    updated,
    skipped,
    notesLinesAppended: notesAppended,
    customFieldValuesWritten: customValueOps.length,
    committed: COMMIT,
  });
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
