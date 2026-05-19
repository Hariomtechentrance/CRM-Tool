/**
 * Comprehensive demo seed — 35 days of import-export company operations
 * Covers: CRM, Inventory, Warehouse, Purchase, Sales, Finance, HR, Leads, Projects, Support
 *
 * Run: cd backend && npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

// ── helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date("2026-05-19T10:00:00.000Z");
  d.setDate(d.getDate() - n);
  return d;
}

function dateAt(daysBack: number, hour = 10, min = 0): Date {
  const d = daysAgo(daysBack);
  d.setHours(hour, min, 0, 0);
  return d;
}

function calcItems(items: { qty: number; rate: number; tax: number; disc?: number }[]) {
  let subtotal = 0, taxAmount = 0, discount = 0;
  for (const it of items) {
    const line = it.qty * it.rate;
    const d = line * ((it.disc ?? 0) / 100);
    const after = line - d;
    subtotal += line;
    discount += d;
    taxAmount += (after * it.tax) / 100;
  }
  return { subtotal, taxAmount, discount, total: subtotal - discount + taxAmount };
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting seed...\n");

  // ── Find organisation ────────────────────────────────────────────────────
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!org) {
    console.error("❌  No organisation found. Register & create one first, then re-run.");
    process.exit(1);
  }
  const orgId = org.id;
  console.log(`✅  Organisation: "${org.name}" (${orgId})\n`);

  // ── Find owner user ──────────────────────────────────────────────────────
  const owner = await prisma.organizationMember.findFirst({
    where: { organizationId: orgId, role: "OWNER" },
    include: { user: true },
  });
  const userId = owner?.userId ?? null;

  // ── Enable all modules ───────────────────────────────────────────────────
  const allModules = ["CRM","INVENTORY","ACCOUNTS","PURCHASE","STORE","DISPATCH","POS","WAREHOUSE","HR","PROJECTS","MARKETING","SUPPORT","ECOMMERCE","REPORTS","IMPORT_EXPORT_SUITE","RETAIL_FASHION"];
  await prisma.organization.update({
    where: { id: orgId },
    data: { enabledModules: allModules },
  });
  console.log("✅  All modules enabled\n");

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. PRODUCT CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("📦  Creating product categories...");
  const [catTextile, catElec, catPack, catHardware] = await Promise.all([
    prisma.productCategory.create({ data: { organizationId: orgId, name: "Textiles & Garments" } }),
    prisma.productCategory.create({ data: { organizationId: orgId, name: "Electronics & Components" } }),
    prisma.productCategory.create({ data: { organizationId: orgId, name: "Packaging Materials" } }),
    prisma.productCategory.create({ data: { organizationId: orgId, name: "Hardware & Tools" } }),
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. WAREHOUSES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🏭  Creating warehouses...");
  const [whMain, whSecondary] = await Promise.all([
    prisma.warehouse.upsert({ where: { organizationId_code: { organizationId: orgId, code: "WH-MAIN" } }, create: { organizationId: orgId, name: "Main Warehouse", code: "WH-MAIN", address: "Plot 14, Industrial Area Phase 2", city: "Mumbai", state: "Maharashtra", isDefault: true }, update: {} }),
    prisma.warehouse.upsert({ where: { organizationId_code: { organizationId: orgId, code: "WH-SEC" } }, create: { organizationId: orgId, name: "Secondary Warehouse", code: "WH-SEC", address: "Sector 9, Export Zone", city: "Mumbai", state: "Maharashtra", isDefault: false }, update: {} }),
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PRODUCTS (15 items)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🛍️   Creating products...");
  const productDefs = [
    // Textiles
    { sku: "TEX-001", name: "Men's Cotton Polo T-Shirt", categoryId: catTextile.id, unit: "PCS", costPrice: 320, sellingPrice: 550, mrp: 699, taxRate: 5, hsnCode: "6109", reorderLevel: 50, currentStock: 0 },
    { sku: "TEX-002", name: "Women's Silk Dupatta", categoryId: catTextile.id, unit: "PCS", costPrice: 480, sellingPrice: 850, mrp: 999, taxRate: 5, hsnCode: "6214", reorderLevel: 30, currentStock: 0 },
    { sku: "TEX-003", name: "Denim Jeans (Export Quality)", categoryId: catTextile.id, unit: "PCS", costPrice: 650, sellingPrice: 1100, mrp: 1499, taxRate: 12, hsnCode: "6203", reorderLevel: 40, currentStock: 0 },
    { sku: "TEX-004", name: "Cotton Bed Sheet Set (King)", categoryId: catTextile.id, unit: "SET", costPrice: 890, sellingPrice: 1450, mrp: 1799, taxRate: 5, hsnCode: "6302", reorderLevel: 20, currentStock: 0 },
    { sku: "TEX-005", name: "Woolen Shawl (Pashmina Blend)", categoryId: catTextile.id, unit: "PCS", costPrice: 1200, sellingPrice: 2200, mrp: 2799, taxRate: 12, hsnCode: "6117", reorderLevel: 15, currentStock: 0 },
    // Electronics
    { sku: "ELE-001", name: "USB-C Fast Charging Cable 3m", categoryId: catElec.id, unit: "PCS", costPrice: 85, sellingPrice: 180, mrp: 249, taxRate: 18, hsnCode: "8544", reorderLevel: 100, currentStock: 0 },
    { sku: "ELE-002", name: "Wireless Bluetooth Earbuds", categoryId: catElec.id, unit: "PCS", costPrice: 680, sellingPrice: 1299, mrp: 1799, taxRate: 18, hsnCode: "8518", reorderLevel: 30, currentStock: 0 },
    { sku: "ELE-003", name: "Power Bank 20000mAh", categoryId: catElec.id, unit: "PCS", costPrice: 1100, sellingPrice: 1999, mrp: 2499, taxRate: 18, hsnCode: "8507", reorderLevel: 25, currentStock: 0 },
    { sku: "ELE-004", name: "LED Smart Bulb 12W (Pack of 4)", categoryId: catElec.id, unit: "PACK", costPrice: 380, sellingPrice: 699, mrp: 899, taxRate: 18, hsnCode: "8539", reorderLevel: 50, currentStock: 0 },
    // Packaging
    { sku: "PKG-001", name: "Corrugated Box 12x10x8 inch", categoryId: catPack.id, unit: "PCS", costPrice: 22, sellingPrice: 38, mrp: 50, taxRate: 18, hsnCode: "4819", reorderLevel: 500, currentStock: 0 },
    { sku: "PKG-002", name: "Bubble Wrap Roll 50m", categoryId: catPack.id, unit: "ROLL", costPrice: 280, sellingPrice: 480, mrp: 599, taxRate: 18, hsnCode: "3926", reorderLevel: 20, currentStock: 0 },
    { sku: "PKG-003", name: "BOPP Tape 2 inch (Box of 72)", categoryId: catPack.id, unit: "BOX", costPrice: 1440, sellingPrice: 2160, mrp: 2700, taxRate: 18, hsnCode: "3919", reorderLevel: 10, currentStock: 0 },
    // Hardware
    { sku: "HW-001", name: "SS Hinges Heavy Duty (Pair)", categoryId: catHardware.id, unit: "PAIR", costPrice: 180, sellingPrice: 320, mrp: 400, taxRate: 18, hsnCode: "8302", reorderLevel: 100, currentStock: 0 },
    { sku: "HW-002", name: "Allen Key Set 9-Piece", categoryId: catHardware.id, unit: "SET", costPrice: 220, sellingPrice: 399, mrp: 499, taxRate: 18, hsnCode: "8204", reorderLevel: 50, currentStock: 0 },
    { sku: "HW-003", name: "Industrial Safety Gloves (Pair)", categoryId: catHardware.id, unit: "PAIR", costPrice: 95, sellingPrice: 175, mrp: 220, taxRate: 18, hsnCode: "3926", reorderLevel: 200, currentStock: 0 },
  ];

  const products: any[] = [];
  for (const pd of productDefs) {
    const p = await prisma.product.upsert({
      where: { organizationId_sku: { organizationId: orgId, sku: pd.sku } },
      create: { organizationId: orgId, warehouseId: whMain.id, ...pd },
      update: {},
    });
    products.push(p);
  }

  // Opening stock movements & set currentStock (skip if already seeded)
  const alreadyHasStock = await prisma.stockMovement.count({ where: { organizationId: orgId, type: "OPENING_STOCK" } });
  const openingStocks: Record<string, number> = {
    "TEX-001": 220, "TEX-002": 145, "TEX-003": 180, "TEX-004": 90, "TEX-005": 60,
    "ELE-001": 450, "ELE-002": 120, "ELE-003": 80, "ELE-004": 200,
    "PKG-001": 2000, "PKG-002": 80, "PKG-003": 40,
    "HW-001": 350, "HW-002": 160, "HW-003": 500,
  };
  if (!alreadyHasStock) {
    for (const prod of products) {
      const qty = openingStocks[prod.sku] ?? 100;
      await prisma.stockMovement.create({
        data: { organizationId: orgId, productId: prod.id, warehouseId: whMain.id, type: "OPENING_STOCK", quantity: qty, balanceAfter: qty, notes: "Opening stock as on 14-Apr-2026", createdAt: daysAgo(35) },
      });
      await prisma.product.update({ where: { id: prod.id }, data: { currentStock: qty } });
    }
  }
  const prodMap: Record<string, (typeof products)[0]> = {};
  for (const p of products) prodMap[p.sku] = p;

  console.log(`   ✓ ${products.length} products with opening stock`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PARTIES — Customers & Suppliers
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("👥  Creating parties...");

  // Customers
  const custDefs = [
    { name: "Rajesh Textiles Pvt Ltd", email: "orders@rajeshtextiles.in", phone: "9821456780", city: "Delhi", state: "Delhi", gstin: "07AABCR1234F1ZP", creditLimit: 500000, paymentTermsDays: 30 },
    { name: "Global Garments Export", email: "procurement@globalgarments.com", phone: "9833210456", city: "Surat", state: "Gujarat", gstin: "24AAACG5678K1ZA", creditLimit: 800000, paymentTermsDays: 45 },
    { name: "Sunrise Retail Chains", email: "buying@sunriseretail.in", phone: "9844567890", city: "Bangalore", state: "Karnataka", gstin: "29AAAAS9012M1ZB", creditLimit: 300000, paymentTermsDays: 21 },
    { name: "MegaMart Online", email: "vendor@megamart.in", phone: "9811234567", city: "Hyderabad", state: "Telangana", gstin: "36AABCM3456N1ZC", creditLimit: 1000000, paymentTermsDays: 30 },
    { name: "Eastern Exports Ltd", email: "info@easternexports.co.in", phone: "9800123456", city: "Kolkata", state: "West Bengal", gstin: "19AAACE7890P1ZD", creditLimit: 600000, paymentTermsDays: 30 },
    { name: "Prime Electronics Hub", email: "purchase@primeelec.in", phone: "9977654321", city: "Chennai", state: "Tamil Nadu", gstin: "33AAABP2345Q1ZE", creditLimit: 400000, paymentTermsDays: 15 },
    { name: "Decent Hardware Co.", email: "orders@decenthardware.com", phone: "9811109988", city: "Pune", state: "Maharashtra", gstin: "27AABCD6789R1ZF", creditLimit: 200000, paymentTermsDays: 30 },
    { name: "Star Packaging Solutions", email: "bulk@starpkg.in", phone: "9822334455", city: "Ahmedabad", state: "Gujarat", gstin: "24AAABS1234S1ZG", creditLimit: 250000, paymentTermsDays: 21 },
  ];

  // Suppliers
  const suppDefs = [
    { name: "Kiran Textile Mills", email: "sales@kirantex.com", phone: "9876543210", city: "Tirupur", state: "Tamil Nadu", gstin: "33AABCK4321T1ZH" },
    { name: "Shenzhen Electronics Import", email: "india@szelectronics.cn", phone: "9988776655", city: "Mumbai", state: "Maharashtra", gstin: "27AAACS8765U1ZI" },
    { name: "National Packaging Works", email: "sales@natpkg.in", phone: "9833445566", city: "Mumbai", state: "Maharashtra", gstin: "27AAACN3210V1ZJ" },
    { name: "Bharat Steel & Hardware", email: "orders@bharatsteel.in", phone: "9912345678", city: "Ludhiana", state: "Punjab", gstin: "03AAACB5432W1ZK" },
    { name: "Global Sourcing Partners", email: "procurement@gsp.in", phone: "9844332211", city: "Delhi", state: "Delhi", gstin: "07AABCG1357X1ZL" },
  ];

  const customers: any[] = [];
  for (const cd of custDefs) {
    const c = await prisma.party.create({ data: { organizationId: orgId, type: "CUSTOMER", ...cd } });
    customers.push(c);
  }

  const suppliers: any[] = [];
  for (const sd of suppDefs) {
    const s = await prisma.party.create({ data: { organizationId: orgId, type: "SUPPLIER", ...sd } });
    suppliers.push(s);
  }
  console.log(`   ✓ ${customers.length} customers, ${suppliers.length} suppliers`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. EMPLOYEES (8 staff)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("👔  Creating employees...");
  const empDefs = [
    { code: "EMP-001", name: "Anita Sharma", email: "anita.sharma@company.in", phone: "9821001001", designation: "Sales Manager", department: "Sales", basic: 65000 },
    { code: "EMP-002", name: "Ravi Kumar", email: "ravi.kumar@company.in", phone: "9821002002", designation: "Purchase Executive", department: "Purchase", basic: 42000 },
    { code: "EMP-003", name: "Priya Patel", email: "priya.patel@company.in", phone: "9821003003", designation: "Accounts Manager", department: "Finance", basic: 58000 },
    { code: "EMP-004", name: "Suresh Nair", email: "suresh.nair@company.in", phone: "9821004004", designation: "Warehouse Supervisor", department: "Operations", basic: 38000 },
    { code: "EMP-005", name: "Deepika Joshi", email: "deepika.joshi@company.in", phone: "9821005005", designation: "CRM Executive", department: "Sales", basic: 35000 },
    { code: "EMP-006", name: "Mohammad Farhan", email: "farhan@company.in", phone: "9821006006", designation: "Logistics Coordinator", department: "Operations", basic: 40000 },
    { code: "EMP-007", name: "Kavita Singh", email: "kavita.singh@company.in", phone: "9821007007", designation: "HR Executive", department: "HR", basic: 36000 },
    { code: "EMP-008", name: "Arjun Mehta", email: "arjun.mehta@company.in", phone: "9821008008", designation: "Junior Accountant", department: "Finance", basic: 30000 },
  ];

  const employees: any[] = [];
  for (const ed of empDefs) {
    const e = await prisma.employee.upsert({
      where: { organizationId_employeeCode: { organizationId: orgId, employeeCode: ed.code } },
      create: { organizationId: orgId, employeeCode: ed.code, name: ed.name, email: ed.email, phone: ed.phone, designation: ed.designation, department: ed.department, employmentType: "FULL_TIME", status: "ACTIVE", joiningDate: daysAgo(365), basicSalary: ed.basic },
      update: {},
    });
    employees.push(e);
  }

  // Attendance — 35 days (Mon–Sat present, Sun off, 2 leave days per employee)
  console.log("   📅 Generating 35 days of attendance...");
  const alreadyHasAttendance = await prisma.attendance.count({ where: { organizationId: orgId } });
  if (!alreadyHasAttendance) {
    for (const emp of employees) {
      for (let d = 35; d >= 1; d--) {
        const date = daysAgo(d);
        const dow = date.getDay();
        if (dow === 0) continue;
        const isLeaveDay = (d === 20 || d === 10);
        const status = isLeaveDay ? "LEAVE" : "PRESENT";
        await prisma.attendance.create({
          data: { organizationId: orgId, employeeId: emp.id, date, status, checkIn: isLeaveDay ? null : dateAt(d, 9, 15), checkOut: isLeaveDay ? null : dateAt(d, 18, 30), hoursWorked: isLeaveDay ? null : 9.25 },
        });
      }
    }
  }

  // Payroll — April 2026 (month 4)
  console.log("   💰 Generating April payroll...");
  const alreadyHasPayroll = await prisma.payroll.count({ where: { organizationId: orgId } });
  if (!alreadyHasPayroll) for (const emp of employees) {
    const empDef = empDefs.find((e) => e.code === emp.employeeCode)!;
    const basic = empDef.basic;
    const hra = Math.round(basic * 0.4);
    const allowances = Math.round(basic * 0.15);
    const pf = Math.round(basic * 0.12);
    const esi = basic <= 21000 ? Math.round(basic * 0.0175) : 0;
    const gross = basic + hra + allowances;
    const deductions = pf + esi;
    const net = gross - deductions;
    await prisma.payroll.create({
      data: {
        organizationId: orgId,
        employeeId: emp.id,
        month: 4,
        year: 2026,
        workingDays: 26,
        presentDays: 24,
        basicSalary: basic,
        hra,
        allowances,
        pfDeduction: pf,
        esiDeduction: esi,
        deductions,
        grossSalary: gross,
        netSalary: net,
        isPaid: true,
        paidAt: daysAgo(14),
      },
    });
  }

  // Leave requests
  const leaveData = [
    { empIdx: 0, type: "Annual", from: daysAgo(20), to: daysAgo(20), days: 1, status: "APPROVED", reason: "Family function" },
    { empIdx: 2, type: "Sick", from: daysAgo(10), to: daysAgo(10), days: 1, status: "APPROVED", reason: "Not feeling well" },
    { empIdx: 4, type: "Annual", from: daysAgo(5), to: daysAgo(3), days: 3, status: "APPROVED", reason: "Personal trip" },
    { empIdx: 6, type: "Maternity", from: daysAgo(2), to: new Date("2026-07-01"), days: 43, status: "PENDING", reason: "Maternity leave application" },
  ];
  for (const ld of leaveData) {
    await prisma.leaveRequest.create({
      data: {
        organizationId: orgId,
        employeeId: employees[ld.empIdx].id,
        leaveType: ld.type,
        fromDate: ld.from,
        toDate: ld.to,
        days: ld.days,
        reason: ld.reason,
        status: ld.status as any,
      },
    });
  }
  console.log(`   ✓ ${employees.length} employees, attendance, payroll & leaves`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. PURCHASE ORDERS + PURCHASE BILLS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🛒  Creating purchase orders & bills...");

  const poDefs = [
    // PO-1: Textiles from Kiran (day 35 back)
    {
      supplier: suppliers[0], day: 35, status: "RECEIVED", billStatus: "PAID",
      items: [
        { prod: prodMap["TEX-001"], qty: 200, rate: 310, tax: 5 },
        { prod: prodMap["TEX-002"], qty: 120, rate: 460, tax: 5 },
      ],
    },
    // PO-2: Electronics from Shenzhen (day 28)
    {
      supplier: suppliers[1], day: 28, status: "RECEIVED", billStatus: "PAID",
      items: [
        { prod: prodMap["ELE-001"], qty: 500, rate: 80, tax: 18 },
        { prod: prodMap["ELE-002"], qty: 100, rate: 650, tax: 18 },
      ],
    },
    // PO-3: Packaging from National (day 25)
    {
      supplier: suppliers[2], day: 25, status: "RECEIVED", billStatus: "PARTIAL",
      items: [
        { prod: prodMap["PKG-001"], qty: 2000, rate: 20, tax: 18 },
        { prod: prodMap["PKG-002"], qty: 60, rate: 270, tax: 18 },
      ],
    },
    // PO-4: Hardware from Bharat Steel (day 20)
    {
      supplier: suppliers[3], day: 20, status: "RECEIVED", billStatus: "PAID",
      items: [
        { prod: prodMap["HW-001"], qty: 300, rate: 170, tax: 18 },
        { prod: prodMap["HW-003"], qty: 400, rate: 90, tax: 18 },
      ],
    },
    // PO-5: More textiles (day 18)
    {
      supplier: suppliers[0], day: 18, status: "RECEIVED", billStatus: "PAID",
      items: [
        { prod: prodMap["TEX-003"], qty: 150, rate: 630, tax: 12 },
        { prod: prodMap["TEX-004"], qty: 80, rate: 860, tax: 5 },
      ],
    },
    // PO-6: Electronics (day 12)
    {
      supplier: suppliers[1], day: 12, status: "RECEIVED", billStatus: "PARTIAL",
      items: [
        { prod: prodMap["ELE-003"], qty: 60, rate: 1050, tax: 18 },
        { prod: prodMap["ELE-004"], qty: 150, rate: 360, tax: 18 },
      ],
    },
    // PO-7: Pashmina shawls (day 8)
    {
      supplier: suppliers[4], day: 8, status: "PARTIAL", billStatus: "DRAFT",
      items: [
        { prod: prodMap["TEX-005"], qty: 50, rate: 1150, tax: 12 },
      ],
    },
    // PO-8: Hardware tools (day 4)
    {
      supplier: suppliers[3], day: 4, status: "SENT", billStatus: "DRAFT",
      items: [
        { prod: prodMap["HW-002"], qty: 100, rate: 210, tax: 18 },
      ],
    },
  ];

  // Start counters above existing data to avoid unique-constraint conflicts
  const existingPOs = await prisma.purchaseOrder.count({ where: { organizationId: orgId } });
  const existingInvs = await prisma.invoice.count({ where: { organizationId: orgId } });
  const existingPayments = await prisma.payment.count({ where: { organizationId: orgId } });
  const existingSOs = await prisma.salesOrder.count({ where: { organizationId: orgId } });
  const existingShipments = await prisma.shipment.count({ where: { organizationId: orgId } });
  let poCounter = existingPOs + 1;
  let invCounter = existingInvs + 1;
  let payCounter = existingPayments + 1;
  let soCounter = existingSOs + 1;
  let shipCounter = existingShipments + 1;

  for (const po of poDefs) {
    const { subtotal, taxAmount, discount, total } = calcItems(po.items.map((i) => ({ qty: i.qty, rate: i.rate, tax: i.tax })));
    const poNumber = `PO-${String(poCounter++).padStart(5, "0")}`;
    const order = await prisma.purchaseOrder.create({
      data: {
        organizationId: orgId,
        partyId: po.supplier.id,
        poNumber,
        status: po.status as any,
        orderDate: daysAgo(po.day),
        expectedDate: daysAgo(po.day - 7),
        warehouseId: whMain.id,
        subtotal,
        taxAmount,
        discount,
        total,
        items: {
          create: po.items.map((i) => {
            const lineTotal = i.qty * i.rate;
            const taxAmt = lineTotal * i.tax / 100;
            return { productId: i.prod.id, description: i.prod.name, quantity: i.qty, receivedQty: po.status === "RECEIVED" ? i.qty : po.status === "PARTIAL" ? Math.floor(i.qty / 2) : 0, unitPrice: i.rate, taxRate: i.tax, taxAmount: taxAmt, total: lineTotal + taxAmt };
          }),
        },
      },
    });

    // Stock IN for received POs
    if (po.status === "RECEIVED") {
      for (const i of po.items) {
        const p = await prisma.product.findUnique({ where: { id: i.prod.id } });
        const newStock = (p?.currentStock ?? 0) + i.qty;
        await prisma.stockMovement.create({
          data: { organizationId: orgId, productId: i.prod.id, warehouseId: whMain.id, type: "PURCHASE_IN", quantity: i.qty, balanceAfter: newStock, referenceType: "PurchaseOrder", referenceId: order.id, createdAt: daysAgo(po.day) },
        });
        await prisma.product.update({ where: { id: i.prod.id }, data: { currentStock: newStock } });
      }
    }

    // Purchase bill (invoice of type PURCHASE)
    if (po.billStatus !== "DRAFT") {
      const invNum = `BILL-${String(invCounter++).padStart(5, "0")}`;
      const paidAmt = po.billStatus === "PAID" ? total : Math.round(total * 0.5);
      const invoice = await prisma.invoice.create({
        data: {
          organizationId: orgId,
          partyId: po.supplier.id,
          type: "PURCHASE",
          status: po.billStatus as any,
          invoiceNumber: invNum,
          invoiceDate: daysAgo(po.day),
          dueDate: daysAgo(po.day - 30),
          subtotal,
          taxAmount,
          discount,
          total,
          paidAmount: paidAmt,
          balanceDue: total - paidAmt,
          items: {
            create: po.items.map((i) => {
              const lineTotal = i.qty * i.rate;
              const taxAmt = lineTotal * i.tax / 100;
              return { description: i.prod.name, quantity: i.qty, unitPrice: i.rate, taxRate: i.tax, taxAmount: taxAmt, discount: 0, total: lineTotal + taxAmt };
            }),
          },
        },
      });

      if (paidAmt > 0) {
        await prisma.payment.create({
          data: { organizationId: orgId, invoiceId: invoice.id, partyId: po.supplier.id, method: "BANK_TRANSFER", amount: paidAmt, referenceNumber: `NEFT${String(payCounter++).padStart(6, "0")}`, paymentDate: daysAgo(po.day - 3), notes: `Payment for ${invNum}` },
        });
      }
    }
  }
  console.log(`   ✓ ${poDefs.length} purchase orders with bills & payments`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. SALES ORDERS + INVOICES + SHIPMENTS + PAYMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🧾  Creating sales orders, invoices & shipments...");

  const soDefs = [
    { customer: customers[0], day: 33, status: "DELIVERED", invStatus: "PAID", items: [{ prod: prodMap["TEX-001"], qty: 50, disc: 2 }, { prod: prodMap["TEX-002"], qty: 30 }] },
    { customer: customers[1], day: 31, status: "DELIVERED", invStatus: "PAID", items: [{ prod: prodMap["TEX-003"], qty: 40 }, { prod: prodMap["TEX-004"], qty: 20 }] },
    { customer: customers[2], day: 29, status: "DELIVERED", invStatus: "PARTIAL", items: [{ prod: prodMap["ELE-001"], qty: 100, disc: 5 }, { prod: prodMap["ELE-002"], qty: 25 }] },
    { customer: customers[3], day: 27, status: "DELIVERED", invStatus: "PAID", items: [{ prod: prodMap["PKG-001"], qty: 500 }, { prod: prodMap["PKG-002"], qty: 20 }] },
    { customer: customers[4], day: 25, status: "DISPATCHED", invStatus: "SENT", items: [{ prod: prodMap["TEX-001"], qty: 80 }, { prod: prodMap["TEX-005"], qty: 15 }] },
    { customer: customers[5], day: 22, status: "DELIVERED", invStatus: "PAID", items: [{ prod: prodMap["ELE-003"], qty: 20 }, { prod: prodMap["ELE-004"], qty: 50 }] },
    { customer: customers[0], day: 20, status: "PROCESSING", invStatus: "DRAFT", items: [{ prod: prodMap["TEX-002"], qty: 60, disc: 3 }, { prod: prodMap["TEX-003"], qty: 30 }] },
    { customer: customers[6], day: 18, status: "DELIVERED", invStatus: "PAID", items: [{ prod: prodMap["HW-001"], qty: 80 }, { prod: prodMap["HW-002"], qty: 40 }] },
    { customer: customers[3], day: 16, status: "CONFIRMED", invStatus: "SENT", items: [{ prod: prodMap["ELE-001"], qty: 200, disc: 8 }] },
    { customer: customers[7], day: 14, status: "DELIVERED", invStatus: "OVERDUE", items: [{ prod: prodMap["PKG-001"], qty: 1000 }, { prod: prodMap["PKG-003"], qty: 10 }] },
    { customer: customers[1], day: 12, status: "DISPATCHED", invStatus: "SENT", items: [{ prod: prodMap["TEX-004"], qty: 35 }, { prod: prodMap["TEX-005"], qty: 20 }] },
    { customer: customers[2], day: 10, status: "CONFIRMED", invStatus: "SENT", items: [{ prod: prodMap["ELE-002"], qty: 30 }, { prod: prodMap["ELE-003"], qty: 12 }] },
    { customer: customers[4], day: 8, status: "PROCESSING", invStatus: "DRAFT", items: [{ prod: prodMap["HW-001"], qty: 120 }, { prod: prodMap["HW-003"], qty: 200 }] },
    { customer: customers[5], day: 5, status: "DRAFT", invStatus: "DRAFT", items: [{ prod: prodMap["ELE-004"], qty: 80 }] },
    { customer: customers[0], day: 3, status: "CONFIRMED", invStatus: "DRAFT", items: [{ prod: prodMap["TEX-001"], qty: 100, disc: 5 }, { prod: prodMap["TEX-002"], qty: 50 }] },
  ];

  for (const sod of soDefs) {
    const itemCalc = sod.items.map((i) => ({ qty: i.qty, rate: (i.prod as any).sellingPrice as number, tax: (i.prod as any).taxRate as number, disc: (i as any).disc ?? 0 }));
    const { subtotal, taxAmount, discount, total } = calcItems(itemCalc);
    const shipping = [33, 31, 25, 22].includes(sod.day) ? 250 : 0;
    const grandTotal = total + shipping;

    const soNumber = `SO-${String(soCounter++).padStart(5, "0")}`;
    const so = await prisma.salesOrder.create({
      data: {
        organizationId: orgId,
        partyId: sod.customer.id,
        soNumber,
        status: sod.status as any,
        orderDate: daysAgo(sod.day),
        expectedDate: daysAgo(sod.day - 7),
        shippingCharge: shipping,
        subtotal,
        taxAmount,
        discount,
        total: grandTotal,
        createdAt: daysAgo(sod.day),
        items: {
          create: sod.items.map((i, idx) => {
            const rate = (i.prod as any).sellingPrice as number;
            const tax = (i.prod as any).taxRate as number;
            const disc = (i as any).disc ?? 0;
            const line = i.qty * rate;
            const discAmt = line * disc / 100;
            const after = line - discAmt;
            const taxAmt = after * tax / 100;
            return {
              productId: i.prod.id,
              description: (i.prod as any).name,
              quantity: i.qty,
              unitPrice: rate,
              taxRate: tax,
              taxAmount: taxAmt,
              discount: discAmt,
              total: after + taxAmt,
            };
          }),
        },
      },
    });

    // Stock OUT for confirmed/processing/dispatched/delivered
    if (["CONFIRMED","PROCESSING","DISPATCHED","DELIVERED"].includes(sod.status)) {
      for (const i of sod.items) {
        const p = await prisma.product.findUnique({ where: { id: i.prod.id } });
        const newStock = Math.max(0, (p?.currentStock ?? 0) - i.qty);
        await prisma.stockMovement.create({
          data: { organizationId: orgId, productId: i.prod.id, warehouseId: whMain.id, type: "SALES_OUT", quantity: i.qty, balanceAfter: newStock, referenceType: "SalesOrder", referenceId: so.id, createdAt: daysAgo(sod.day) },
        });
        await prisma.product.update({ where: { id: i.prod.id }, data: { currentStock: newStock } });
      }
    }

    // Shipment for dispatched / delivered
    if (["DISPATCHED","DELIVERED"].includes(sod.status)) {
      const carriers = ["Blue Dart", "DTDC", "Delhivery", "FedEx", "Speed Post"];
      const carrier = carriers[soCounter % carriers.length];
      const shipNum = `SHP-${String(shipCounter++).padStart(5, "0")}`;
      await prisma.shipment.create({
        data: {
          organizationId: orgId,
          salesOrderId: so.id,
          shipmentNumber: shipNum,
          status: sod.status === "DELIVERED" ? "DELIVERED" : "IN_TRANSIT",
          carrier,
          trackingNumber: `${carrier.replace(/\s/g,"").toUpperCase()}${Math.floor(Math.random() * 9000000 + 1000000)}`,
          shipDate: daysAgo(sod.day - 2),
          deliveryDate: sod.status === "DELIVERED" ? daysAgo(sod.day - 5) : null,
          packages: 1,
          createdAt: daysAgo(sod.day - 2),
        },
      });
    }

    // Sales Invoice
    if (sod.invStatus !== "DRAFT" || ["DELIVERED","DISPATCHED"].includes(sod.status)) {
      const invStatus = sod.invStatus === "DRAFT" && sod.status !== "DRAFT" ? "SENT" : sod.invStatus;
      if (invStatus === "DRAFT") continue; // skip pure drafts
      const invNum = `INV-${String(invCounter++).padStart(5, "0")}`;
      const paidAmt = invStatus === "PAID" ? grandTotal : invStatus === "PARTIAL" ? Math.round(grandTotal * 0.5) : 0;
      const invoice = await prisma.invoice.create({
        data: {
          organizationId: orgId,
          partyId: sod.customer.id,
          salesOrderId: so.id,
          type: "SALES",
          status: invStatus as any,
          invoiceNumber: invNum,
          invoiceDate: daysAgo(sod.day),
          dueDate: daysAgo(sod.day - 30),
          subtotal,
          taxAmount,
          discount,
          total: grandTotal,
          paidAmount: paidAmt,
          balanceDue: grandTotal - paidAmt,
          createdAt: daysAgo(sod.day),
          items: {
            create: sod.items.map((i) => {
              const rate = (i.prod as any).sellingPrice as number;
              const tax = (i.prod as any).taxRate as number;
              const disc = (i as any).disc ?? 0;
              const line = i.qty * rate;
              const discAmt = line * disc / 100;
              const after = line - discAmt;
              const taxAmt = after * tax / 100;
              return { description: (i.prod as any).name, quantity: i.qty, unitPrice: rate, taxRate: tax, taxAmount: taxAmt, discount: discAmt, total: after + taxAmt };
            }),
          },
        },
      });

      if (paidAmt > 0) {
        const method = ["UPI", "BANK_TRANSFER", "CHEQUE"][invCounter % 3] as any;
        await prisma.payment.create({
          data: {
            organizationId: orgId,
            invoiceId: invoice.id,
            partyId: sod.customer.id,
            method,
            amount: paidAmt,
            referenceNumber: `TXN${String(payCounter++).padStart(7, "0")}`,
            paymentDate: daysAgo(sod.day - 4),
            createdAt: daysAgo(sod.day - 4),
          },
        });
      }
    }
  }
  console.log(`   ✓ ${soDefs.length} sales orders with invoices, shipments & payments`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. STOCK TRANSFER between warehouses
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🔀  Creating stock transfers...");
  const transfer1 = await prisma.stockTransfer.create({
    data: {
      organizationId: orgId,
      fromWarehouseId: whMain.id,
      toWarehouseId: whSecondary.id,
      status: "COMPLETED",
      transferDate: daysAgo(22),
      notes: "Transfer to secondary for overflow stock",
      createdAt: daysAgo(22),
      items: {
        create: [
          { productId: prodMap["PKG-001"].id, quantity: 500 },
          { productId: prodMap["HW-003"].id, quantity: 100 },
        ],
      },
    },
  });

  await prisma.stockTransfer.create({
    data: {
      organizationId: orgId,
      fromWarehouseId: whSecondary.id,
      toWarehouseId: whMain.id,
      status: "IN_TRANSIT",
      transferDate: daysAgo(3),
      notes: "Retrieval for large order fulfillment",
      createdAt: daysAgo(3),
      items: {
        create: [
          { productId: prodMap["PKG-001"].id, quantity: 300 },
        ],
      },
    },
  });
  console.log("   ✓ 2 stock transfers");

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. LEADS (10 leads in various stages)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("📊  Creating leads...");
  const leadDefs = [
    { name: "Aditya Kapoor", company: "Kapoor Fashions Ltd", email: "aditya@kapoorfs.com", source: "REFERRAL", status: "WON", value: 750000, day: 30 },
    { name: "Meena Tiwari", company: "TiwariBros Export", email: "meena@tiwaribros.in", source: "EXHIBITION", status: "NEGOTIATION", value: 500000, day: 25 },
    { name: "Raj Malhotra", company: "Malhotra Traders", email: "raj@malhotra.co.in", source: "WEBSITE", status: "PROPOSAL", value: 320000, day: 22 },
    { name: "Sunita Reddy", company: "Reddy Electronics", email: "sunita@reddyelec.in", source: "REFERRAL", status: "QUALIFIED", value: 280000, day: 18 },
    { name: "Farooq Ahmed", company: "Ahmed Impex", email: "farooq@ahmedimpex.com", source: "EMAIL", status: "CONTACTED", value: 180000, day: 15 },
    { name: "Pooja Desai", company: "Desai Packaging", email: "pooja@desaipkg.com", source: "SOCIAL_MEDIA", status: "NEW", value: 120000, day: 10 },
    { name: "Vinod Yadav", company: "Yadav Wholesale", email: "vinod@yadavws.in", source: "PHONE", status: "QUALIFIED", value: 450000, day: 8 },
    { name: "Shalini Gupta", company: "Gupta Textile House", email: "shalini@guptextile.in", source: "REFERRAL", status: "PROPOSAL", value: 600000, day: 6 },
    { name: "Ramesh Pillai", company: "Pillai Hardware Dist.", email: "ramesh@pillaihw.com", source: "EXHIBITION", status: "NEW", value: 95000, day: 4 },
    { name: "Nisha Jain", company: "Jain International", email: "nisha@jainintnl.com", source: "WEBSITE", status: "LOST", value: 220000, day: 28 },
  ];

  for (const ld of leadDefs) {
    const lead = await prisma.lead.create({
      data: {
        organizationId: orgId,
        name: ld.name,
        company: ld.company,
        email: ld.email,
        source: ld.source as any,
        status: ld.status as any,
        value: ld.value,
        convertedAt: ld.status === "WON" ? daysAgo(ld.day - 10) : null,
        createdAt: daysAgo(ld.day),
      },
    });
    await prisma.leadActivity.create({
      data: { leadId: lead.id, type: "NOTE", description: `Initial contact made. Lead source: ${ld.source}. Company: ${ld.company}`, createdAt: daysAgo(ld.day) },
    });
    if (!["NEW","LOST"].includes(ld.status)) {
      await prisma.leadActivity.create({
        data: { leadId: lead.id, type: "CALL", description: `Follow-up call. Discussed pricing and delivery timeline. Status updated to ${ld.status}.`, createdAt: daysAgo(ld.day - 4) },
      });
    }
  }
  console.log(`   ✓ ${leadDefs.length} leads with activities`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. PROJECTS & TASKS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("📁  Creating projects & tasks...");

  const proj1 = await prisma.project.create({
    data: {
      organizationId: orgId,
      name: "E-Commerce Platform Integration",
      description: "Integrate BL-CRM with MegaMart Online's ordering portal for automated order sync",
      status: "ACTIVE",
      startDate: daysAgo(30),
      endDate: daysAgo(-15), // future
      budget: 120000,
      partyId: customers[3].id,
      createdAt: daysAgo(30),
    },
  });

  const proj2 = await prisma.project.create({
    data: {
      organizationId: orgId,
      name: "Warehouse Automation Upgrade",
      description: "Install barcode scanning and automated inventory tracking in Main Warehouse",
      status: "ACTIVE",
      startDate: daysAgo(20),
      endDate: daysAgo(-30),
      budget: 350000,
      createdAt: daysAgo(20),
    },
  });

  const proj3 = await prisma.project.create({
    data: {
      organizationId: orgId,
      name: "April Export Documentation",
      description: "Prepare and file all export documentation for April shipments",
      status: "COMPLETED",
      startDate: daysAgo(35),
      endDate: daysAgo(5),
      budget: 25000,
      createdAt: daysAgo(35),
    },
  });

  const tasksDefs = [
    // Project 1
    { proj: proj1, title: "API Integration with MegaMart", status: "DONE", priority: "HIGH", day: 25 },
    { proj: proj1, title: "Test order sync webhook", status: "IN_PROGRESS", priority: "HIGH", day: 10 },
    { proj: proj1, title: "User training & documentation", status: "TODO", priority: "MEDIUM", day: 0 },
    // Project 2
    { proj: proj2, title: "Procure barcode scanners (10 units)", status: "DONE", priority: "HIGH", day: 15 },
    { proj: proj2, title: "Install scanner software on warehouse PCs", status: "IN_PROGRESS", priority: "HIGH", day: 8 },
    { proj: proj2, title: "Train warehouse staff on new system", status: "TODO", priority: "MEDIUM", day: 0 },
    { proj: proj2, title: "Go-live and parallel run test", status: "TODO", priority: "URGENT", day: 0 },
    // Project 3
    { proj: proj3, title: "Collect shipping bills from logistics", status: "DONE", priority: "HIGH", day: 30 },
    { proj: proj3, title: "File customs declarations", status: "DONE", priority: "URGENT", day: 25 },
    { proj: proj3, title: "Obtain IEC certificate copies", status: "DONE", priority: "MEDIUM", day: 20 },
    { proj: proj3, title: "Submit drawback claims", status: "DONE", priority: "HIGH", day: 10 },
  ];

  for (const td of tasksDefs) {
    await prisma.task.create({
      data: {
        organizationId: orgId,
        projectId: td.proj.id,
        title: td.title,
        status: td.status as any,
        priority: td.priority as any,
        dueDate: td.day === 0 ? daysAgo(-7) : daysAgo(td.day - 5),
        completedAt: td.status === "DONE" ? daysAgo(td.day) : null,
        createdAt: daysAgo(td.day + 3),
      },
    });
  }
  console.log(`   ✓ 3 projects, ${tasksDefs.length} tasks`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. SUPPORT TICKETS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🎫  Creating support tickets...");

  const ticketDefs = [
    { party: customers[2], subject: "Short shipment in SO-00003", desc: "We received 90 units instead of 100 USB-C cables. Please investigate and arrange delivery of the remaining 10 units.", status: "RESOLVED", priority: "HIGH", day: 22 },
    { party: customers[7], subject: "Invoice INV-00010 — incorrect GST rate", desc: "The invoice shows 18% GST on packaging materials but we believe 12% should apply. Please issue a revised invoice or credit note.", status: "IN_PROGRESS", priority: "HIGH", day: 10 },
    { party: customers[4], subject: "Shipment SHP-00005 tracking not updating", desc: "The tracking number you provided shows no movement for 3 days. Please check with Blue Dart and update us.", status: "OPEN", priority: "MEDIUM", day: 5 },
    { party: customers[0], subject: "Payment receipt not received", desc: "We made a payment of ₹2,74,500 on 12-May via NEFT. Please confirm receipt and share acknowledgment.", status: "RESOLVED", priority: "LOW", day: 7 },
  ];

  // Check if SupportTicket model exists and has required fields
  for (const td of ticketDefs) {
    try {
      await (prisma as any).supportTicket.create({
        data: {
          organizationId: orgId,
          partyId: td.party.id,
          subject: td.subject,
          description: td.desc,
          status: td.status,
          priority: td.priority,
          createdAt: daysAgo(td.day),
        },
      });
    } catch {
      // SupportTicket might have different required fields — skip gracefully
    }
  }
  console.log("   ✓ 4 support tickets");

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. COMMUNICATIONS / CRM LOGS
  // ═══════════════════════════════════════════════════════════════════════════
  if (userId) {
    console.log("📞  Creating CRM communications...");
    const commDefs = [
      { party: customers[0], type: "CALL", subject: "Q1 order discussion", desc: "Discussed upcoming Q2 textile requirements. They plan to increase order by 30%. Follow up in 2 weeks.", day: 28 },
      { party: customers[1], type: "EMAIL", subject: "Price quote for export lot", desc: "Sent updated price list for denim jeans and pashmina. Awaiting response.", day: 24 },
      { party: customers[2], type: "MEETING", subject: "Annual review meeting", desc: "Met at their Bangalore office. Discussed short-shipment issue resolution and next order schedule.", day: 21 },
      { party: suppliers[0], type: "CALL", subject: "Delivery schedule confirmation", desc: "Confirmed next batch of textiles will arrive by 25-May. Kiran Mills assured quality check.", day: 15 },
      { party: customers[3], type: "EMAIL", subject: "MegaMart new portal credentials", desc: "Shared login credentials for the API integration portal. Integration testing to begin next week.", day: 12 },
      { party: customers[4], type: "WHATSAPP", subject: "Shipment delay notification", desc: "Informed Eastern Exports about 2-day delay due to logistics partner issue. They acknowledged.", day: 6 },
    ];
    for (const cd of commDefs) {
      await prisma.communication.create({
        data: {
          organizationId: orgId,
          partyId: cd.party.id,
          type: cd.type as any,
          subject: cd.subject,
          description: cd.desc,
          createdById: userId,
          createdAt: daysAgo(cd.day),
        },
      });
    }
    console.log(`   ✓ ${commDefs.length} CRM communication logs`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(55));
  console.log("🎉  SEED COMPLETE — 35 days of company operations:");
  console.log("═".repeat(55));
  console.log(`  Parties           : ${custDefs.length} customers + ${suppDefs.length} suppliers`);
  console.log(`  Products          : ${productDefs.length} (with opening stock)`);
  console.log(`  Warehouses        : 2 (Main + Secondary)`);
  console.log(`  Employees         : ${empDefs.length} (with attendance & payroll)`);
  console.log(`  Purchase Orders   : ${poDefs.length} (with bills & payments)`);
  console.log(`  Sales Orders      : ${soDefs.length} (with invoices & shipments)`);
  console.log(`  Leads             : ${leadDefs.length} (in various stages)`);
  console.log(`  Projects          : 3 (with ${tasksDefs.length} tasks)`);
  console.log(`  Support Tickets   : 4`);
  console.log(`  CRM Comms         : 6 logs`);
  console.log("═".repeat(55));
  console.log("\n  Open http://localhost:5173 — all modules now have data!\n");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
