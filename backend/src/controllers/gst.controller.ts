import { Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { OrgRequest } from "../middleware/orgContext";
import { ok, badRequest, serverError } from "../utils/response";

// Indian state code map (GST 2-digit codes)
const STATE_CODE_MAP: Record<string, string> = {
  "andhra pradesh": "37", "arunachal pradesh": "12", "assam": "18", "bihar": "10",
  "chhattisgarh": "22", "goa": "30", "gujarat": "24", "haryana": "06",
  "himachal pradesh": "02", "jharkhand": "20", "karnataka": "29", "kerala": "32",
  "madhya pradesh": "23", "maharashtra": "27", "manipur": "14", "meghalaya": "17",
  "mizoram": "15", "nagaland": "13", "odisha": "21", "punjab": "03",
  "rajasthan": "08", "sikkim": "11", "tamil nadu": "33", "telangana": "36",
  "tripura": "16", "uttar pradesh": "09", "uttarakhand": "05", "west bengal": "19",
  "delhi": "07", "jammu and kashmir": "01", "ladakh": "38",
  "chandigarh": "04", "dadra and nagar haveli": "26", "daman and diu": "25",
  "lakshadweep": "31", "puducherry": "34", "andaman and nicobar": "35",
};

function getStateCode(state?: string | null): string {
  if (!state) return "07";
  return STATE_CODE_MAP[state.toLowerCase().trim()] || "07";
}

function getDateRange(month: number, year: number) {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59);
  return { from, to };
}

// Same lookup as STATE_CODE_MAP above, expressed as a SQL derived table so
// Postgres can classify an invoice as interstate/intrastate (and group/sum
// accordingly) without pulling every invoice row into Node first — that
// row-pull-then-reduce() pattern was the actual cause of this file's
// endpoints loading thousands of full `Invoice` (+ `party`/`items`) rows
// into memory just to total a handful of numbers.
const STATE_CODE_VALUES = Prisma.sql`(VALUES
  ('andhra pradesh','37'), ('arunachal pradesh','12'), ('assam','18'), ('bihar','10'),
  ('chhattisgarh','22'), ('goa','30'), ('gujarat','24'), ('haryana','06'),
  ('himachal pradesh','02'), ('jharkhand','20'), ('karnataka','29'), ('kerala','32'),
  ('madhya pradesh','23'), ('maharashtra','27'), ('manipur','14'), ('meghalaya','17'),
  ('mizoram','15'), ('nagaland','13'), ('odisha','21'), ('punjab','03'),
  ('rajasthan','08'), ('sikkim','11'), ('tamil nadu','33'), ('telangana','36'),
  ('tripura','16'), ('uttar pradesh','09'), ('uttarakhand','05'), ('west bengal','19'),
  ('delhi','07'), ('jammu and kashmir','01'), ('ladakh','38'),
  ('chandigarh','04'), ('dadra and nagar haveli','26'), ('daman and diu','25'),
  ('lakshadweep','31'), ('puducherry','34'), ('andaman and nicobar','35')
) AS sc(state_name, code)`;

// Mirrors `partyStateCode = party?.gstin ? party.gstin.substring(0, 2) :
// getStateCode(party?.state)` exactly, including the JS falsy-empty-string
// check on gstin (NULLIF turns '' into NULL so COALESCE falls through to the
// state lookup, same as the `? :` ternary does for an empty-string gstin).
const PARTY_STATE_CODE_SQL = Prisma.sql`COALESCE(substring(NULLIF(p."gstin", ''), 1, 2), sc.code, '07')`;

// ── GSTR-1: Outward Supplies ──────────────────────────────────
export async function getGSTR1(req: OrgRequest, res: Response): Promise<void> {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const { from, to } = getDateRange(month, year);

    const org = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: { state: true, gstStateCode: true, taxId: true, name: true },
    });
    const orgStateCode = org?.gstStateCode || getStateCode(org?.state);

    // Fetch all SALES invoices in the period (exclude DRAFT, CANCELLED).
    // GSTR-1's B2B/B2C-Large/B2C-Small buckets are genuinely invoice-level
    // filing data (each invoice must be listed), so this findMany itself
    // can't be turned into an aggregate — but it no longer drags in every
    // line `item` of every invoice just to loop them in JS; the HSN summary
    // below is now a single grouped SQL query instead.
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: req.organizationId!,
        type: "SALES",
        status: { notIn: ["DRAFT", "CANCELLED"] },
        invoiceDate: { gte: from, lte: to },
      },
      include: {
        party: { select: { name: true, gstin: true, state: true } },
      },
      orderBy: { invoiceDate: "asc" },
    });

    // Compute GST split per invoice
    const processed = invoices.map((inv) => {
      const partyStateCode = inv.party?.gstin ? inv.party.gstin.substring(0, 2) : getStateCode(inv.party?.state);
      const isInterState = partyStateCode !== orgStateCode;

      // Sum item-level tax
      const taxableValue = inv.subtotal - inv.discount;
      const igst = isInterState ? inv.taxAmount : 0;
      const cgst = !isInterState ? inv.taxAmount / 2 : 0;
      const sgst = !isInterState ? inv.taxAmount / 2 : 0;

      return {
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        partyName: inv.party?.name || "Unknown",
        partyGSTIN: inv.party?.gstin || "",
        placeOfSupply: inv.placeOfSupply || partyStateCode,
        isInterState,
        taxableValue: parseFloat(taxableValue.toFixed(2)),
        igst: parseFloat(igst.toFixed(2)),
        cgst: parseFloat(cgst.toFixed(2)),
        sgst: parseFloat(sgst.toFixed(2)),
        total: parseFloat(inv.total.toFixed(2)),
        type: inv.type,
      };
    });

    // B2B: parties with GSTIN
    const b2b = processed.filter((i) => i.partyGSTIN);
    // B2C Large: taxable value > 2.5L, no GSTIN
    const b2cLarge = processed.filter((i) => !i.partyGSTIN && i.taxableValue > 250000);
    // B2C Small: rest
    const b2cSmall = processed.filter((i) => !i.partyGSTIN && i.taxableValue <= 250000);

    // HSN Summary — grouped by Postgres (GROUP BY hsnCode with SUM()) instead
    // of looping every invoice's line items in JS. A single sales invoice can
    // carry many items, and this JS loop (over the full `items` relation of
    // every invoice in the period) was the actual memory blow-up on this
    // endpoint — replaced by one grouped SQL query over `InvoiceItem`.
    const hsnRows = await prisma.$queryRaw<{ hsnCode: string; description: string | null; totalQty: number; taxableValue: number; igst: number; cgst: number; sgst: number }[]>`
      WITH base AS (
        SELECT
          COALESCE(NULLIF(ii."hsnCode", ''), '0000') AS "hsnCode",
          ii."description" AS description,
          ii."quantity" AS quantity,
          ii."unitPrice" AS "unitPrice",
          ii."discount" AS discount,
          ii."taxAmount" AS "taxAmount",
          ${PARTY_STATE_CODE_SQL} AS party_state_code
        FROM "InvoiceItem" ii
        JOIN "Invoice" inv ON inv.id = ii."invoiceId"
        LEFT JOIN "Party" p ON p.id = inv."partyId"
        LEFT JOIN ${STATE_CODE_VALUES} ON sc.state_name = lower(trim(p."state"))
        WHERE inv."organizationId" = ${req.organizationId!}
          AND inv."type" = 'SALES'
          AND inv."status" NOT IN ('DRAFT', 'CANCELLED')
          AND inv."invoiceDate" >= ${from} AND inv."invoiceDate" <= ${to}
      )
      SELECT
        "hsnCode",
        MIN(description) AS description,
        COALESCE(SUM(quantity), 0) AS "totalQty",
        COALESCE(SUM(quantity * "unitPrice" - discount), 0) AS "taxableValue",
        COALESCE(SUM(CASE WHEN party_state_code <> ${orgStateCode} THEN "taxAmount" ELSE 0 END), 0) AS igst,
        COALESCE(SUM(CASE WHEN party_state_code = ${orgStateCode} THEN "taxAmount" / 2 ELSE 0 END), 0) AS cgst,
        COALESCE(SUM(CASE WHEN party_state_code = ${orgStateCode} THEN "taxAmount" / 2 ELSE 0 END), 0) AS sgst
      FROM base
      GROUP BY "hsnCode"
      ORDER BY "hsnCode"
    `;
    const hsnSummary = hsnRows.map((r) => ({
      hsnCode: r.hsnCode,
      description: r.description ?? "",
      totalQty: Number(r.totalQty),
      taxableValue: Number(r.taxableValue),
      igst: Number(r.igst),
      cgst: Number(r.cgst),
      sgst: Number(r.sgst),
    }));

    // Totals
    const totals = {
      taxableValue: processed.reduce((s, i) => s + i.taxableValue, 0),
      igst: processed.reduce((s, i) => s + i.igst, 0),
      cgst: processed.reduce((s, i) => s + i.cgst, 0),
      sgst: processed.reduce((s, i) => s + i.sgst, 0),
      total: processed.reduce((s, i) => s + i.total, 0),
      invoiceCount: processed.length,
    };

    ok(res, {
      period: { month, year },
      orgGSTIN: org?.taxId || "",
      orgName: org?.name || "",
      b2b, b2cLarge, b2cSmall,
      hsnSummary,
      totals,
    });
  } catch (err) {
    serverError(res, err);
  }
}

// ── GSTR-3B: Monthly Summary ─────────────────────────────────
export async function getGSTR3B(req: OrgRequest, res: Response): Promise<void> {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const { from, to } = getDateRange(month, year);

    const org = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: { state: true, gstStateCode: true, taxId: true, name: true },
    });
    const orgStateCode = org?.gstStateCode || getStateCode(org?.state);
    const orgId = req.organizationId!;

    // GSTR-3B's response is a pure monthly summary (no per-invoice list) —
    // so unlike GSTR-1/ITC Ledger below, there's no reason to pull invoice
    // rows into Node at all here. Both the outward (SALES) and ITC
    // (PURCHASE) totals, split by interstate/intrastate, are now computed
    // directly in Postgres instead of two full `findMany` + JS for-loops.
    async function gstTotals(invoiceType: "SALES" | "PURCHASE") {
      const typeSql = invoiceType === "SALES" ? Prisma.sql`'SALES'` : Prisma.sql`'PURCHASE'`;
      const rows = await prisma.$queryRaw<{ count: bigint; taxable: number; igst: number; cgst: number }[]>`
        WITH base AS (
          SELECT inv."subtotal" AS subtotal, inv."discount" AS discount, inv."taxAmount" AS "taxAmount",
            ${PARTY_STATE_CODE_SQL} AS party_state_code
          FROM "Invoice" inv
          LEFT JOIN "Party" p ON p.id = inv."partyId"
          LEFT JOIN ${STATE_CODE_VALUES} ON sc.state_name = lower(trim(p."state"))
          WHERE inv."organizationId" = ${orgId}
            AND inv."type" = ${typeSql}
            AND inv."status" NOT IN ('DRAFT', 'CANCELLED')
            AND inv."invoiceDate" >= ${from} AND inv."invoiceDate" <= ${to}
        )
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(subtotal - discount), 0) AS taxable,
          COALESCE(SUM(CASE WHEN party_state_code <> ${orgStateCode} THEN "taxAmount" ELSE 0 END), 0) AS igst,
          COALESCE(SUM(CASE WHEN party_state_code = ${orgStateCode} THEN "taxAmount" / 2 ELSE 0 END), 0) AS cgst
        FROM base
      `;
      const r = rows[0];
      const igst = Number(r?.igst ?? 0);
      const cgst = Number(r?.cgst ?? 0);
      return { count: Number(r?.count ?? 0), taxable: Number(r?.taxable ?? 0), igst, cgst, sgst: cgst };
    }

    const [outward, itc] = await Promise.all([gstTotals("SALES"), gstTotals("PURCHASE")]);

    const netIGST = Math.max(0, outward.igst - itc.igst);
    const netCGST = Math.max(0, outward.cgst - itc.cgst);
    const netSGST = Math.max(0, outward.sgst - itc.sgst);

    ok(res, {
      period: { month, year },
      orgGSTIN: org?.taxId || "",
      orgName: org?.name || "",
      outward: {
        taxableValue: parseFloat(outward.taxable.toFixed(2)),
        igst: parseFloat(outward.igst.toFixed(2)),
        cgst: parseFloat(outward.cgst.toFixed(2)),
        sgst: parseFloat(outward.sgst.toFixed(2)),
        total: parseFloat((outward.igst + outward.cgst + outward.sgst).toFixed(2)),
        invoiceCount: outward.count,
      },
      itc: {
        taxableValue: parseFloat(itc.taxable.toFixed(2)),
        igst: parseFloat(itc.igst.toFixed(2)),
        cgst: parseFloat(itc.cgst.toFixed(2)),
        sgst: parseFloat(itc.sgst.toFixed(2)),
        total: parseFloat((itc.igst + itc.cgst + itc.sgst).toFixed(2)),
        invoiceCount: itc.count,
      },
      netTax: {
        igst: parseFloat(netIGST.toFixed(2)),
        cgst: parseFloat(netCGST.toFixed(2)),
        sgst: parseFloat(netSGST.toFixed(2)),
        total: parseFloat((netIGST + netCGST + netSGST).toFixed(2)),
      },
    });
  } catch (err) {
    serverError(res, err);
  }
}

// ── ITC Ledger (Input Tax Credit) ────────────────────────────
export async function getITCLedger(req: OrgRequest, res: Response): Promise<void> {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const { from, to } = getDateRange(month, year);

    const org = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: { state: true, gstStateCode: true },
    });
    const orgStateCode = org?.gstStateCode || getStateCode(org?.state);

    // Unlike GSTR-3B above, this endpoint's actual output IS the per-invoice
    // ledger (`entries`) — there's no aggregate-only shortcut here, every
    // purchase invoice in the month has to be listed. This findMany is
    // already as lean as it can be (date-range bounded, no `items` include,
    // only the 3 `party` fields actually used below), so it's left as-is;
    // `total` is a cheap reduce over the entries array already in memory,
    // not a second DB round trip.
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: req.organizationId!,
        type: "PURCHASE",
        status: { notIn: ["DRAFT", "CANCELLED"] },
        invoiceDate: { gte: from, lte: to },
      },
      include: { party: { select: { name: true, gstin: true, state: true } } },
      orderBy: { invoiceDate: "asc" },
    });

    const entries = invoices.map((inv) => {
      const partyStateCode = inv.party?.gstin ? inv.party.gstin.substring(0, 2) : getStateCode(inv.party?.state);
      const isInterState = partyStateCode !== orgStateCode;
      return {
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        vendorName: inv.party?.name || "Unknown",
        vendorGSTIN: inv.party?.gstin || "",
        taxableValue: parseFloat((inv.subtotal - inv.discount).toFixed(2)),
        igst: isInterState ? parseFloat(inv.taxAmount.toFixed(2)) : 0,
        cgst: !isInterState ? parseFloat((inv.taxAmount / 2).toFixed(2)) : 0,
        sgst: !isInterState ? parseFloat((inv.taxAmount / 2).toFixed(2)) : 0,
        totalITC: parseFloat(inv.taxAmount.toFixed(2)),
      };
    });

    ok(res, { period: { month, year }, entries, total: entries.reduce((s, e) => s + e.totalITC, 0) });
  } catch (err) {
    serverError(res, err);
  }
}

// ── Annual GST Summary ────────────────────────────────────────
export async function getAnnualSummary(req: OrgRequest, res: Response): Promise<void> {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const org = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: { taxId: true },
    });
    // Note: the original per-month loop also derived `orgStateCode` here,
    // but never actually used it — this report has no interstate split
    // (only total outward tax / ITC per month), so it's dropped rather than
    // ported forward.
    const orgId = req.organizationId!;

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    // Was: 12 iterations x 2 `findMany` calls (24 full-table-scoped queries,
    // sequential awaits) each pulling every invoice for that month into Node
    // just to sum `taxAmount`/`subtotal`/`discount`. Replaced with one
    // grouped SQL query per invoice type covering the whole year.
    const [salesRows, purchaseRows] = await Promise.all([
      prisma.$queryRaw<{ month_key: string; taxable: number; tax: number; count: bigint }[]>`
        SELECT TO_CHAR(DATE_TRUNC('month', "invoiceDate"), 'YYYY-MM') AS month_key,
          COALESCE(SUM("subtotal" - "discount"), 0) AS taxable,
          COALESCE(SUM("taxAmount"), 0) AS tax,
          COUNT(*) AS count
        FROM "Invoice"
        WHERE "organizationId" = ${orgId} AND "type" = 'SALES'
          AND "status" NOT IN ('DRAFT', 'CANCELLED')
          AND "invoiceDate" >= ${yearStart} AND "invoiceDate" <= ${yearEnd}
        GROUP BY DATE_TRUNC('month', "invoiceDate")
      `,
      prisma.$queryRaw<{ month_key: string; tax: number }[]>`
        SELECT TO_CHAR(DATE_TRUNC('month', "invoiceDate"), 'YYYY-MM') AS month_key,
          COALESCE(SUM("taxAmount"), 0) AS tax
        FROM "Invoice"
        WHERE "organizationId" = ${orgId} AND "type" = 'PURCHASE'
          AND "status" NOT IN ('DRAFT', 'CANCELLED')
          AND "invoiceDate" >= ${yearStart} AND "invoiceDate" <= ${yearEnd}
        GROUP BY DATE_TRUNC('month', "invoiceDate")
      `,
    ]);
    const salesByMonth = new Map(salesRows.map((r) => [r.month_key, r]));
    const itcByMonth = new Map(purchaseRows.map((r) => [r.month_key, Number(r.tax)]));

    const months = [];
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${String(m).padStart(2, "0")}`;
      const s = salesByMonth.get(key);
      const outwardTax = Number(s?.tax ?? 0);
      const itc = itcByMonth.get(key) ?? 0;
      months.push({
        month: m,
        label: new Date(year, m - 1).toLocaleString("en-IN", { month: "short" }),
        outwardTaxable: Number(s?.taxable ?? 0),
        outwardTax: parseFloat(outwardTax.toFixed(2)),
        itc: parseFloat(itc.toFixed(2)),
        netPayable: parseFloat(Math.max(0, outwardTax - itc).toFixed(2)),
        invoiceCount: Number(s?.count ?? 0),
      });
    }

    ok(res, { year, orgGSTIN: org?.taxId || "", months });
  } catch (err) {
    serverError(res, err);
  }
}
