import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface OrgInfo { name: string; address?: string; phone?: string; email?: string; taxId?: string; }
interface LineItem { description: string; qty: number; unitPrice: number; taxRate?: number; total: number; }
interface DocData {
  type: "INVOICE" | "QUOTATION" | "PURCHASE_ORDER";
  number: string;
  date: string;
  dueDate?: string;
  partyName?: string;
  partyAddress?: string;
  partyGST?: string;
  items: LineItem[];
  subtotal: number;
  taxAmount: number;
  discount?: number;
  total: number;
  notes?: string;
  org: OrgInfo;
}

const BRAND = "#6366f1";
const DARK  = "#0f0f1a";
const GRAY  = "#6b7280";

export function generatePDF(doc: DocData): void {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210; // A4 width mm

  // ── Header bar ──────────────────────────────────────────────
  pdf.setFillColor(BRAND);
  pdf.rect(0, 0, W, 28, "F");

  // Company name
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(doc.org.name, 14, 11);

  // Doc type badge
  const label = doc.type === "INVOICE" ? "TAX INVOICE"
               : doc.type === "QUOTATION" ? "QUOTATION"
               : "PURCHASE ORDER";
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(label, 14, 19);

  // Doc number top-right
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text(`#${doc.number}`, W - 14, 11, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`Date: ${doc.date}`, W - 14, 17, { align: "right" });
  if (doc.dueDate) pdf.text(`Due: ${doc.dueDate}`, W - 14, 22, { align: "right" });

  // ── Org details ──────────────────────────────────────────────
  pdf.setTextColor(60, 60, 80);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  let y = 36;
  if (doc.org.address) { pdf.text(doc.org.address, 14, y); y += 5; }
  if (doc.org.phone)   { pdf.text(`Ph: ${doc.org.phone}`, 14, y); y += 5; }
  if (doc.org.email)   { pdf.text(`Email: ${doc.org.email}`, 14, y); y += 5; }
  if (doc.org.taxId)   { pdf.text(`GSTIN: ${doc.org.taxId}`, 14, y); y += 5; }

  // ── Bill to ──────────────────────────────────────────────────
  if (doc.partyName) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 120);
    pdf.text("BILL TO", W / 2 + 4, 36);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(30, 30, 50);
    pdf.setFontSize(10);
    pdf.text(doc.partyName, W / 2 + 4, 42);
    let by = 47;
    if (doc.partyAddress) { pdf.setFontSize(9); pdf.text(doc.partyAddress, W / 2 + 4, by); by += 5; }
    if (doc.partyGST)     { pdf.setFontSize(9); pdf.text(`GSTIN: ${doc.partyGST}`, W / 2 + 4, by); }
  }

  // ── Divider ──────────────────────────────────────────────────
  const tableY = Math.max(y + 4, 68);
  pdf.setDrawColor(220, 220, 235);
  pdf.line(14, tableY - 2, W - 14, tableY - 2);

  // ── Items table ──────────────────────────────────────────────
  autoTable(pdf, {
    startY: tableY,
    head: [["#", "Description", "Qty", "Unit Price", "Tax %", "Total"]],
    body: doc.items.map((item, i) => [
      i + 1,
      item.description,
      item.qty,
      `₹${item.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      item.taxRate ? `${item.taxRate}%` : "—",
      `₹${item.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    ]),
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [40, 40, 60] },
    alternateRowStyles: { fillColor: [248, 248, 255] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "center" },
      5: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
    theme: "grid",
  });

  // ── Totals ───────────────────────────────────────────────────
  const finalY = (pdf as any).lastAutoTable.finalY + 6;
  const totX = W - 80;

  const row = (label: string, val: string, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(bold ? 30 : 100, bold ? 30 : 100, bold ? 50 : 120);
    pdf.text(label, totX, finalY + (row as any).y);
    pdf.text(val, W - 14, finalY + (row as any).y, { align: "right" });
    (row as any).y += 6;
  };
  (row as any).y = 0;

  row("Subtotal", `₹${doc.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);
  row("Tax", `₹${doc.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);
  if (doc.discount) row("Discount", `-₹${doc.discount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);

  // Total box
  const totY = finalY + (row as any).y;
  pdf.setFillColor(BRAND);
  pdf.roundedRect(totX - 4, totY - 2, W - 14 - totX + 18, 10, 2, 2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("TOTAL", totX, totY + 5);
  pdf.text(`₹${doc.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, W - 14, totY + 5, { align: "right" });

  // ── Notes ────────────────────────────────────────────────────
  if (doc.notes) {
    const notesY = totY + 18;
    pdf.setFillColor(248, 248, 255);
    pdf.setDrawColor(220, 220, 235);
    pdf.roundedRect(14, notesY, W - 28, 16, 2, 2, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 120);
    pdf.text("NOTES", 18, notesY + 5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(60, 60, 80);
    pdf.text(doc.notes, 18, notesY + 10, { maxWidth: W - 36 });
  }

  // ── Footer ───────────────────────────────────────────────────
  pdf.setFillColor(240, 240, 248);
  pdf.rect(0, 280, W, 17, "F");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(GRAY);
  pdf.text(`Generated by FlowCRM · ${doc.org.name}`, W / 2, 289, { align: "center" });

  pdf.save(`${doc.type.toLowerCase()}-${doc.number}.pdf`);
}
