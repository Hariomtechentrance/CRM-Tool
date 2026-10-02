import { Response } from "express";
import { prisma } from "../lib/prisma";
import { OrgRequest } from "../middleware/orgContext";
import { ok, created, notFound, badRequest, serverError } from "../utils/response";

const db = () => (prisma as any);

// ── List bank transactions ────────────────────────────────────
export async function listTransactions(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const { status, from, to, account } = req.query as Record<string, string>;

    const txns = await db().bankTransaction.findMany({
      where: {
        organizationId: orgId,
        ...(status && status !== "ALL" && { reconcileStatus: status }),
        ...(account && { accountName: { contains: account, mode: "insensitive" } }),
        ...(from || to ? { txnDate: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
      },
      orderBy: { txnDate: "desc" },
      take: 200,
    });

    // Stats
    const stats = {
      total: txns.length,
      unmatched: txns.filter((t: any) => t.reconcileStatus === "UNMATCHED").length,
      matched: txns.filter((t: any) => t.reconcileStatus === "MATCHED").length,
      ignored: txns.filter((t: any) => t.reconcileStatus === "IGNORED").length,
      creditTotal: txns.filter((t: any) => t.type === "CREDIT").reduce((s: number, t: any) => s + t.amount, 0),
      debitTotal:  txns.filter((t: any) => t.type === "DEBIT").reduce((s: number, t: any) => s + t.amount, 0),
    };

    ok(res, { transactions: txns, stats });
  } catch (err) {
    serverError(res, err);
  }
}

// ── Import transactions from CSV rows (parsed by frontend) ────
export async function importTransactions(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const { accountName, rows } = req.body as {
      accountName: string;
      rows: { txnDate: string; description: string; amount: number; type: "CREDIT" | "DEBIT"; reference?: string }[];
    };

    if (!accountName || !rows?.length) {
      badRequest(res, "accountName and rows[] required");
      return;
    }

    const created = await db().bankTransaction.createMany({
      data: rows.map(r => ({
        organizationId: orgId,
        accountName,
        txnDate: new Date(r.txnDate),
        description: r.description,
        amount: Number(r.amount),
        type: r.type,
        reference: r.reference ?? null,
        reconcileStatus: "UNMATCHED",
      })),
    });

    ok(res, { imported: created.count });
  } catch (err) {
    serverError(res, err);
  }
}

// ── Auto-match: find invoices/payments with matching amounts ──
export async function autoMatch(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;

    const unmatched = await db().bankTransaction.findMany({
      where: { organizationId: orgId, reconcileStatus: "UNMATCHED" },
    });

    if (unmatched.length === 0) {
      ok(res, { matched: 0, total: 0 });
      return;
    }

    const credits = unmatched.filter((t: any) => t.type === "CREDIT");
    const debits = unmatched.filter((t: any) => t.type === "DEBIT");

    // min/max via reduce (not Math.min(...array)) so a large unmatched batch
    // can't blow the call stack on the spread.
    const minOf = (nums: number[]) => nums.reduce((m, v) => (v < m ? v : m), nums[0]);
    const maxOf = (nums: number[]) => nums.reduce((m, v) => (v > m ? v : m), nums[0]);

    // Was: one `payment.findFirst` + one `bankTransaction.update` per
    // transaction, awaited sequentially inside the for-loop — N round trips
    // to the DB, one at a time. Now: a single findMany per side (Payment for
    // CREDITs, Invoice for DEBITs) covering the whole batch's amount/date
    // range, with the exact same per-transaction amount-±1 / date-window
    // matching rule then evaluated in memory, and the resulting updates
    // issued in parallel. Matching criteria are unchanged — only the DB
    // access pattern is.
    const [candidatePayments, candidateInvoices] = await Promise.all([
      credits.length
        ? prisma.payment.findMany({
            where: {
              organizationId: orgId,
              amount: { gte: minOf(credits.map((t: any) => t.amount)) - 1, lte: maxOf(credits.map((t: any) => t.amount)) + 1 },
              // Pre-existing bug found while verifying this fix: `Payment`
              // has no `paidAt` field (it's `paymentDate`) — this where
              // clause has been throwing "Unknown argument `paidAt`" on
              // every call that reaches this branch, meaning CREDIT-side
              // auto-match has never actually worked. Fixed here since it
              // was found in the course of today's change, not introduced by it.
              paymentDate: {
                gte: new Date(minOf(credits.map((t: any) => t.txnDate.getTime())) - 2 * 86400000),
                lte: new Date(maxOf(credits.map((t: any) => t.txnDate.getTime())) + 2 * 86400000),
              },
            },
          })
        : Promise.resolve([] as any[]),
      debits.length
        ? prisma.invoice.findMany({
            where: {
              organizationId: orgId,
              type: "PURCHASE",
              total: { gte: minOf(debits.map((t: any) => t.amount)) - 1, lte: maxOf(debits.map((t: any) => t.amount)) + 1 },
              invoiceDate: {
                gte: new Date(minOf(debits.map((t: any) => t.txnDate.getTime())) - 3 * 86400000),
                lte: new Date(maxOf(debits.map((t: any) => t.txnDate.getTime())) + 3 * 86400000),
              },
            },
          })
        : Promise.resolve([] as any[]),
    ]);

    const updates: Promise<any>[] = [];
    let matched = 0;

    for (const txn of credits) {
      // Same criteria as the original findFirst: amount within ±1, paymentDate
      // within ±2 days of the transaction date.
      const payment = candidatePayments.find((p: any) =>
        p.amount >= txn.amount - 1 && p.amount <= txn.amount + 1 &&
        p.paymentDate.getTime() >= txn.txnDate.getTime() - 2 * 86400000 &&
        p.paymentDate.getTime() <= txn.txnDate.getTime() + 2 * 86400000
      );
      if (payment) {
        matched++;
        updates.push(db().bankTransaction.update({
          where: { id: txn.id },
          data: { reconcileStatus: "MATCHED", matchedPaymentId: payment.id },
        }));
      }
    }

    for (const txn of debits) {
      // Same criteria as the original findFirst: total within ±1, invoiceDate
      // within ±3 days of the transaction date.
      const invoice = candidateInvoices.find((i: any) =>
        i.total >= txn.amount - 1 && i.total <= txn.amount + 1 &&
        i.invoiceDate.getTime() >= txn.txnDate.getTime() - 3 * 86400000 &&
        i.invoiceDate.getTime() <= txn.txnDate.getTime() + 3 * 86400000
      );
      if (invoice) {
        matched++;
        updates.push(db().bankTransaction.update({
          where: { id: txn.id },
          data: { reconcileStatus: "MATCHED", matchedInvoiceId: invoice.id },
        }));
      }
    }

    await Promise.all(updates);

    ok(res, { matched, total: unmatched.length });
  } catch (err) {
    serverError(res, err);
  }
}

// ── Manual match / ignore / unmatch ──────────────────────────
export async function updateTransactionStatus(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const id = String(req.params.id);
    const { reconcileStatus, matchedInvoiceId, matchedPaymentId, notes } = req.body as {
      reconcileStatus: string;
      matchedInvoiceId?: string;
      matchedPaymentId?: string;
      notes?: string;
    };

    const txn = await db().bankTransaction.findFirst({ where: { id, organizationId: orgId } });
    if (!txn) { notFound(res, "Transaction not found"); return; }

    const valid = ["UNMATCHED", "MATCHED", "IGNORED"];
    if (!valid.includes(reconcileStatus)) { badRequest(res, "Invalid status"); return; }

    const updated = await db().bankTransaction.update({
      where: { id },
      data: {
        reconcileStatus,
        ...(matchedInvoiceId !== undefined && { matchedInvoiceId: matchedInvoiceId || null }),
        ...(matchedPaymentId !== undefined && { matchedPaymentId: matchedPaymentId || null }),
        ...(notes !== undefined && { notes }),
      },
    });

    ok(res, updated);
  } catch (err) {
    serverError(res, err);
  }
}

// ── Delete a transaction ──────────────────────────────────────
export async function deleteTransaction(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const id = String(req.params.id);

    const txn = await db().bankTransaction.findFirst({ where: { id, organizationId: orgId } });
    if (!txn) { notFound(res, "Transaction not found"); return; }

    await db().bankTransaction.delete({ where: { id } });
    ok(res, { deleted: true });
  } catch (err) {
    serverError(res, err);
  }
}
