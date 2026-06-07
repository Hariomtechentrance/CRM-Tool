# FlowCRM — Complete User Guide

> **Platform:** Multi-tenant SaaS CRM & ERP  
> **Designed for:** Import-Export, Trading, Manufacturing, Service businesses  
> **Version:** 2.0

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [CRM — Contacts & Companies](#3-crm--contacts--companies)
4. [Inventory](#4-inventory)
5. [Purchase Orders](#5-purchase-orders)
6. [Sales & Dispatch](#6-sales--dispatch)
7. [Finance & Accounts](#7-finance--accounts)
8. [HR & Payroll](#8-hr--payroll)
9. [Projects](#9-projects)
10. [Marketing & Leads](#10-marketing--leads)
11. [Appointments](#11-appointments)
12. [Automations](#12-automations)
13. [Email](#13-email)
14. [WhatsApp Business](#14-whatsapp-business)
15. [Lead Capture Forms](#15-lead-capture-forms)
16. [Support Tickets](#16-support-tickets)
17. [Deals & Pipeline](#17-deals--pipeline)
18. [Quotations](#18-quotations)
19. [Documents](#19-documents)
20. [GST, E-Invoice & E-Way Bill](#20-gst-e-invoice--e-way-bill)
21. [TDS / TCS](#21-tds--tcs)
22. [Budgets](#22-budgets)
23. [Bank Reconciliation](#23-bank-reconciliation)
24. [Reports & Analytics](#24-reports--analytics)
25. [Trade / Import-Export Suite](#25-trade--import-export-suite)
26. [Warehouse](#26-warehouse)
27. [Retail & POS](#27-retail--pos)
28. [Batch Tracking & BOM](#28-batch-tracking--bom)
29. [Admin Panel](#29-admin-panel)
30. [Security Center](#30-security-center)
31. [Settings](#31-settings)
32. [Webhooks](#32-webhooks)
33. [Super Admin (Platform Owner)](#33-super-admin-platform-owner)
34. [Roles & Permissions Reference](#34-roles--permissions-reference)
35. [Custom Fields — Add Your Own Data Fields](#35-custom-fields--add-your-own-data-fields)
36. [Branding — Make It Look Like Your Business](#36-branding--make-it-look-like-your-business)
37. [Compliance — Stay Legally Safe in India](#37-compliance--stay-legally-safe-in-india)
38. [Tele-calling Centre](#38-tele-calling-centre)
39. [Stock Market Advisory](#39-stock-market-advisory)
40. [Health & Patient Management](#40-health--patient-management)

---

## 1. Getting Started

### 1.1 Register an Account

1. Open the app URL in your browser and click **Get Started** on the landing page.
2. Click **Register** and fill in:
   - Full Name
   - Email address
   - Password *(minimum 8 characters — must include uppercase letter, a number, and a special character)*
3. Click **Create Account**.
4. Check your inbox for a **verification email** and click the link inside to activate your account.

### 1.2 Log In

1. Go to `/login`.
2. Enter your **email** and **password**, then click **Sign In**.
3. After 5 consecutive failed attempts your account is locked for 30 minutes. Contact your Admin to unlock it early via *Admin Panel → Team → Unlock*.

> **Tip:** If you log in from a new device or IP address, you will receive a security alert email. This is normal — just make sure it was you.

### 1.3 Forgot Password

1. Click **Forgot password?** on the login page.
2. Enter your email and click **Send Reset Link**.
3. Open the email, click the reset link, and enter a new strong password.
4. You cannot reuse your last 5 passwords.

### 1.4 Create an Organisation

After your first login you will be prompted to create an organisation:

1. Enter your **Organisation Name** (e.g. "OM Import Export Ltd").
2. Select your **Industry** and **Country**.
3. Click **Create Organisation**.

You are automatically assigned the **OWNER** role. You can later invite team members.

### 1.5 Switch Organisations

If you belong to multiple organisations, click the **organisation name at the top-left** of the sidebar to open the switcher dropdown and select another organisation.

---

## 2. Dashboard

The Dashboard (`/dashboard`) is your real-time command centre.

| Section | What it shows |
|---|---|
| KPI Cards | Total parties, products, active orders, open leads, open tickets, team members |
| Revenue Chart | Monthly revenue vs order volume (bar + line chart) |
| Lead Pipeline | Count and total value per lead stage |
| Order Status | Breakdown of sales order statuses |
| Purchase Status | Breakdown of purchase order statuses |
| Activity Feed | Latest 10 events across the platform (invoices, orders, leads, tickets, parties) |

**How to use:**
- Click any KPI card to navigate directly to that module.
- Hover over chart bars/lines for exact numbers.
- The feed refreshes automatically. Click any feed item to jump to that record.

---

## 3. CRM — Contacts & Companies

Path: **Sidebar → CRM** (`/crm`)

The CRM stores all your business contacts — customers, suppliers, or both.

### 3.1 Add a Party

1. Click **+ Add** (top-right).
2. Fill in:
   - **Name** (required)
   - **Type**: Customer / Supplier / Both
   - Phone, Email, City, State, GSTIN, PAN, Credit Limit, Payment Terms
3. Click **Save**.

### 3.2 Filter & Search

- Use the **search bar** to find by name, phone, email, or GSTIN.
- Click **All / Customers / Suppliers / Both** tabs to filter by type.
- Pagination at the bottom loads the next 20 records.

### 3.3 View Party Details

Click any party row to open the **Party Detail Page** (`/crm/:id`) which shows:
- Contact info & documents
- Transaction history (invoices, payments, orders)
- Activity timeline
- Attached documents

### 3.4 Edit a Party

On the detail page, click **Edit** to update any field, then **Save**.

### 3.5 Bulk Import

1. Click **Import** (cloud icon, top-right).
2. Download the **CSV template**.
3. Fill in your contacts (one per row) and upload the file.
4. Review the preview — green rows will be imported, red rows show validation errors.
5. Click **Confirm Import**.

### 3.6 Duplicate Detection

Path: **Sidebar → Duplicates** (`/duplicates`)

The system automatically flags parties with the same phone, email, or GSTIN. Review pairs and **Merge** or **Dismiss** each one.

---

## 4. Inventory

Path: **Sidebar → Inventory** (`/inventory`)

### 4.1 Add a Product

1. Click **+ Add Product**.
2. Fill in:
   - **SKU** (auto-generated or custom)
   - **Name**, Unit (PCS/KG/MTR/BOX/LTR/SET)
   - Cost Price, Selling Price, MRP
   - Tax Rate (GST %), HSN Code
   - Reorder Level, Category, Barcode
3. Click **Save Product**.

### 4.2 Stock Movement

To adjust stock (receive goods, wastage, etc.):
1. Click **Stock Movement** button.
2. Select product, movement type (*Adjustment In / Adjustment Out / Damage / Return*), quantity, and add a note.
3. Click **Save**.

### 4.3 Barcode Scanner

Click the **camera icon** (Scan) to activate your device camera and scan a barcode to look up or add a product instantly.

### 4.4 Low Stock Alerts

The KPI bar shows **Low Stock** and **Out of Stock** counts in red/amber. Click the count to filter the table to only those products.

### 4.5 Categories

Manage categories from inside the Add/Edit product form's category dropdown. Type a new category name and press Enter to create it on the fly.

### 4.6 Bulk Import

Same as CRM — download template, fill, upload, confirm.

---

## 5. Purchase Orders

Path: **Sidebar → Purchase** (`/purchase`)

### 5.1 Create a Purchase Order

1. Click **+ New Purchase Order**.
2. Select **Supplier** from your CRM.
3. Add line items: choose product from inventory (auto-fills price/HSN), enter quantity.
4. Set **Expected Delivery Date**, payment terms.
5. Click **Save as Draft** or **Submit**.

### 5.2 Approve a Purchase Order

Org Admins can approve orders:
1. Open the PO.
2. Click **Approve** → status changes to *Confirmed*.

### 5.3 Receive Goods

When goods arrive:
1. Open the approved PO.
2. Click **Mark Received** — stock is automatically added to inventory.

### 5.4 Track Status

Statuses flow: `DRAFT → SUBMITTED → APPROVED → RECEIVED → CANCELLED`

---

## 6. Sales & Dispatch

Path: **Sidebar → Dispatch** (`/dispatch`)

### 6.1 Create a Sales Order / Invoice

1. Click **+ New Order**.
2. Select **Customer** from CRM.
3. Add products (price and tax auto-fill from inventory).
4. Set dispatch date, payment terms, shipping address.
5. **Save as Draft** → **Confirm** → **Dispatch** → **Delivered**.

### 6.2 Record Payment

On an open invoice:
1. Click **Record Payment**.
2. Enter amount, payment mode (Cash/Bank/UPI/Cheque), and date.
3. Save — the invoice status updates to *Paid* when fully settled.

### 6.3 Generate PDF

Click the **PDF** icon on any invoice to download a formatted invoice PDF.

### 6.4 Share via Invoice Portal

Click **Share Portal** to generate a public link your customer can use to view and download their invoice without logging in.

---

## 7. Finance & Accounts

Path: **Sidebar → Accounts** (`/accounts`)

Manages income/expense ledger, journal entries, and payment tracking.

### 7.1 Add a Transaction

1. Click **+ Add Transaction**.
2. Select type: **Income** or **Expense**.
3. Fill in category, amount, date, party, reference number, notes.
4. Save.

### 7.2 Recurring Invoices

Path: `/recurring`

1. Click **+ New Recurring Invoice**.
2. Set customer, line items, and **recurrence** (Weekly/Monthly/Quarterly/Yearly).
3. Set start date and end date (optional).
4. The system auto-generates the next invoice on each cycle.

### 7.3 Payments Module

Path: **Sidebar → Accounts → Payments**

Track all outgoing and incoming payments, link them to invoices or purchase orders.

---

## 8. HR & Payroll

Path: **Sidebar → HR** (`/hr`)

### 8.1 Add an Employee

1. Click **+ Add Employee**.
2. Fill in: Name, Designation, Department, Phone, Email, Date of Joining, Basic Salary.
3. Save.

### 8.2 Attendance

1. Open the employee record.
2. Click **Mark Attendance** → select Present / Absent / Half Day / Leave.

### 8.3 Payroll

1. Click **Generate Payroll** for the current month.
2. Review deductions and additions.
3. Click **Approve & Finalize** to lock the payroll.

### 8.4 Team Dashboard

Path: `/team-dashboard` — Shows attendance summary, task load, and leave balance for all team members at a glance.

---

## 9. Projects

Path: **Sidebar → Projects** (`/projects`)

### 9.1 Create a Project

1. Click **+ New Project**.
2. Enter: Name, Description, Client (optional), Start Date, Due Date, Status.
3. Assign team members.
4. Save.

### 9.2 Add Tasks

Inside a project:
1. Click **+ Add Task**.
2. Set title, description, assignee, priority (Low/Medium/High/Critical), due date.
3. Save.

### 9.3 IT Projects & Sprint Board

Path: `/it-projects` and `/sprint-board`

For software/IT teams:
1. Create an **IT Project** and link it to GitHub or Jira (optional).
2. Create **Sprints** inside the project with a start/end date.
3. Use the **Sprint Board** (Kanban view) to drag tasks across columns: *To Do → In Progress → In Review → Done*.

### 9.4 My Work

Path: `/my-work` — Shows all tasks assigned to **you** across all projects, sorted by due date.

### 9.5 Public Project Page

Share a read-only project status page with a client via **Share → Generate Public Link**.

---

## 10. Marketing & Leads

Path: **Sidebar → Marketing** (`/marketing`)

### 10.1 Add a Lead

1. Click **+ Add Lead**.
2. Fill in: Name, Company, Phone, Email, City, Industry.
3. Set **Source** (Website / IndiaMart / JustDial / WhatsApp / Facebook / Instagram / Referral, etc.).
4. Assign to a team member, set next follow-up date.
5. Save.

### 10.2 Lead Statuses

Move leads through the pipeline by clicking the **Status** chip on any lead card:

`NEW → CONTACTED → QUALIFIED → PROPOSAL → NEGOTIATION → WON / LOST`

### 10.3 Lead Score & Grade

- **Score** (0-100): Auto-calculated based on activities, recency, and engagement. Edit manually if needed.
- **Grade** (A/B/C/D): A = hottest lead. Set manually or let automations update it.

### 10.4 Log an Activity

1. Click the **clock icon** on a lead card or open the lead and click **Log Activity**.
2. Select type: Call / Email / WhatsApp / Meeting / Note.
3. Fill in subject, description, outcome.
4. For calls: select call outcome (Answered / No Answer / Callback Requested, etc.) and duration.
5. Set a **follow-up date** to schedule the next touchpoint.
6. Save.

### 10.5 Do Not Call (DNC)

Toggle the **DNC** flag on a lead to prevent bulk WhatsApp/call actions from targeting them.

### 10.6 Bulk Import Leads

Click **Import** → download the CSV template → fill and upload.

### 10.7 Kanban View

Click the **Kanban** toggle (top-right of leads page) to switch from table to Kanban board view, where each column is a pipeline stage. Drag cards between columns to update status.

### 10.8 Activities Feed

Path: **Sidebar → Activities** (`/activities`) — A chronological feed of all activities logged across all leads, filterable by type and date range.

---

## 11. Appointments

Path: **Sidebar → Appointments** (`/appointments`)

### 11.1 Book an Appointment

1. Click **+ New Appointment**.
2. Set: Title, Lead (link to a lead), Assigned Staff, Date & Time, Duration, Location or Meeting Link.
3. Add notes.
4. Save.

### 11.2 Views

Toggle between **List**, **Calendar Day**, and **Calendar Week** views using the buttons at the top-right.

### 11.3 Update Status

Click an appointment and change status to: *Scheduled → Completed / Cancelled / No Show*.

---

## 12. Automations

Path: **Sidebar → Automations** (`/automations`)

Automations let you create **IF-THEN rules** that run automatically on your leads.

### 12.1 Create an Automation Rule

1. Click **+ New Rule**.
2. Set the **Trigger** (WHEN):
   - Lead status changes to a specific value
   - New lead is created
   - Tag is added
   - Lead score goes above a threshold
   - Follow-up date is due
3. Set the **Action** (THEN):
   - Create a follow-up activity
   - Add a tag to the lead
   - Update the lead grade
   - Assign lead to a specific user
4. Name the rule and click **Save Rule**.

### 12.2 Enable / Disable Rules

Use the toggle on each rule card to turn it on or off without deleting it.

### 12.3 Delete a Rule

Click the **trash icon** on the rule card.

---

## 13. Email

Path: **Sidebar → Email** (`/email`)

### 13.1 Compose & Send

1. Click **+ Compose**.
2. Enter To, Subject, and message body.
3. Click **Send**.

### 13.2 Email Templates

Create reusable templates for common emails (follow-ups, quotes, greetings).

### 13.3 Inbox

View all emails sent and received through your connected mailbox.

---

## 14. WhatsApp Business

Path: **Sidebar → WhatsApp** (`/whatsapp`)

### 14.1 Connect WhatsApp (First-time Setup)

1. Go to [developers.facebook.com](https://developers.facebook.com) and create a **Meta Business App**.
2. Add the **WhatsApp** product to your app.
3. In **API Setup**, copy your **Phone Number ID** and generate a **System User Access Token** (permanent token).
4. Back in FlowCRM → WhatsApp → enter:
   - Phone Number ID
   - Access Token
   - WABA ID (WhatsApp Business Account ID)
   - Your WhatsApp phone number
5. Click **Save Configuration**.

### 14.2 Send a Message to a Lead

1. Go to the **Send** tab.
2. Search and select a lead.
3. Type your message.
4. Click **Send Message**.

### 14.3 Send a Template Message

1. Go to the **Templates** tab.
2. Select an approved Meta template.
3. Fill in template variables (e.g. customer name, order number).
4. Select a lead and click **Send Template**.

### 14.4 Bulk Send

1. Go to the **Bulk Send** tab.
2. Select multiple leads from the list (DNC leads are automatically excluded).
3. Type your message.
4. Click **Send to All** — a summary shows sent/failed/skipped counts.

### 14.5 Message History

The **History** tab shows all outgoing and incoming WhatsApp messages with status icons:
- ✓ Sent  
- ✓✓ Delivered (blue ticks)  
- ⚠ Failed

### 14.6 Incoming Messages (Webhook)

When a customer replies on WhatsApp, the message is automatically matched to their lead record and appears in the history.

---

## 15. Lead Capture Forms

Path: **Sidebar → Lead Forms** (`/lead-forms`)

Create public web forms that auto-create leads when submitted — no login required for visitors.

### 15.1 Create a Form

1. Click **+ New Form**.
2. Enter a **Form Name**.
3. Choose a **Lead Source** to tag all submissions (e.g. Website, IndiaMART).
4. **Add Fields**:
   - Click **+ Add Field**
   - Set field label, type (text/email/phone/textarea/select/checkbox), and mark as required if needed
   - Drag to reorder fields
5. Write a **Success Message** shown after submission.
6. Click **Save Form**.

### 15.2 Share the Form

Each form has a unique public URL in the format `/forms/<id>`. Copy the URL and:
- Paste it in your website
- Share it on social media
- Use it in email campaigns
- Embed it via an iframe

### 15.3 View Submissions

Click **Submissions** on the form card to see all leads captured, including submitted data and timestamp.

### 15.4 Toggle Active/Inactive

Use the toggle on the form card to stop accepting new submissions without deleting the form.

---

## 16. Support Tickets

Path: **Sidebar → Support** (`/support`)

### 16.1 Create a Ticket

1. Click **+ New Ticket**.
2. Enter: Subject, Description, Priority (Low/Medium/High/Critical), Party (customer).
3. Assign to a support staff member.
4. Save.

### 16.2 Update a Ticket

Open a ticket and:
- Add replies/comments
- Change status: `OPEN → IN_PROGRESS → RESOLVED → CLOSED`
- Escalate priority

### 16.3 SLA Tracking

Tickets past their response SLA show a red indicator. Filter by **Overdue** to prioritise.

---

## 17. Deals & Pipeline

Path: **Sidebar → Deals** (`/deals`)

Track large B2B sales opportunities with a deal value and close date.

### 17.1 Create a Deal

1. Click **+ New Deal**.
2. Enter: Deal Name, Party (customer), Value (₹), Stage, Expected Close Date.
3. Assign to a sales rep.
4. Save.

### 17.2 Move Deal Stages

Drag the deal card across Kanban columns or change the stage dropdown:

`PROSPECTING → QUALIFICATION → PROPOSAL → NEGOTIATION → CLOSED WON / CLOSED LOST`

### 17.3 Link to Quotation

Open a deal → click **Link Quotation** to connect a formal quotation document to the deal.

---

## 18. Quotations

Path: **Sidebar → Quotations** (`/quotations`)

### 18.1 Create a Quotation

1. Click **+ New Quotation**.
2. Select customer, validity date.
3. Add line items (product + qty + rate — taxes auto-fill from inventory).
4. Add terms & conditions.
5. Click **Save** → status is *Draft*.

### 18.2 Send to Customer

1. Open the quotation.
2. Click **Send** to email it directly to the customer.
3. Or click **PDF** to download and share manually.

### 18.3 Convert to Order

Once the customer approves:
1. Open the quotation.
2. Click **Convert to Sales Order** — creates a linked sales order automatically.

---

## 19. Documents

Path: **Sidebar → Documents** (`/documents`)

A central document repository for your organisation.

1. Click **Upload Document**.
2. Set name, category (Invoice/Contract/Certificate/Other), and optionally link to a Party or Order.
3. Upload the file (PDF, image, Excel, etc.).
4. All team members with document access can search and download.

---

## 20. GST, E-Invoice & E-Way Bill

### 20.1 GST Reports

Path: **Sidebar → GST Reports** (`/gst`)

- View GSTR-1 (outward supplies), GSTR-2 (inward supplies), and GSTR-3B summaries.
- Filter by period (month/quarter).
- Download as CSV for filing.

### 20.2 E-Invoice IRN

Path: **Sidebar → E-Invoice IRN** (`/einvoice`)

1. Open a confirmed sales invoice.
2. Click **Generate IRN** — the system calls the IRP API and stores the IRN + QR code.
3. Download the **e-Invoice PDF** with embedded QR code.

> **Prerequisite:** Configure your GSP credentials in Settings → GST Setup.

### 20.3 E-Way Bill

Path: **Sidebar → E-Way Bill** (`/ewaybill`)

1. Select an invoice/delivery challan.
2. Fill in transporter details, vehicle number, distance.
3. Click **Generate E-Way Bill** — EWB number is returned and stored.
4. Print or download the EWB.

---

## 21. TDS / TCS

Path: **Sidebar → TDS / TCS** (`/tds`)

- Record TDS deductions on vendor payments.
- Record TCS collected on customer sales.
- View section-wise summary for quarterly returns.
- Download Form 26Q data.

---

## 22. Budgets

Path: **Sidebar → Budgets** (`/budgets`)

1. Click **+ New Budget**.
2. Enter: Budget Name, Period (monthly/quarterly/annual), Start Date.
3. Add line items: Category → Planned Amount.
4. Save.
5. As transactions are recorded in Accounts, the budget tracker shows **Actual vs Planned** with variance.

---

## 23. Bank Reconciliation

Path: **Sidebar → Reconciliation** (`/reconciliation`)

1. Import your **bank statement** (CSV format).
2. The system auto-matches statement lines to recorded transactions.
3. Review unmatched items:
   - **Match manually** — link to an existing transaction.
   - **Create transaction** — add a new record for it.
4. Click **Mark Reconciled** when balanced.

---

## 24. Reports & Analytics

Path: **Sidebar → Reports** (`/reports`)

### Available Reports

| Report | Description |
|---|---|
| Sales Summary | Revenue, order count, average order value by period |
| Purchase Summary | Total procurement spend by supplier/period |
| Lead Conversion | Lead-to-customer conversion rate by source/stage |
| Inventory Valuation | Current stock value at cost price |
| Party Ledger | Statement of account for any customer/supplier |
| Outstanding Payments | Unpaid invoices and aging buckets |
| Expense Analysis | Category-wise expense breakdown |
| Team Performance | Tasks completed, leads closed per team member |

**To export any report:** Click the **Download CSV** or **Download PDF** button at the top-right of the report.

---

## 25. Trade / Import-Export Suite

Path: **Sidebar → Import/Export** (`/import-export`)

Designed specifically for import-export businesses. Tracks:
- Shipments (BL number, vessel, ETA)
- LC (Letter of Credit) tracking
- Custom duty and clearance status
- Port-wise movement
- Currency-wise invoice tracking

### 25.1 Create a Trade Record

1. Click **+ New Shipment**.
2. Fill in: BL/AWB number, Supplier/Customer, Country, Port of Loading, Port of Discharge, ETA.
3. Add line items with HS code, quantity, unit, rate, currency.
4. Save.

### 25.2 Track Status

Update shipment status: `BOOKING → SAILING → ARRIVED → CUSTOMS → CLEARED → DELIVERED`

---

## 26. Warehouse

Path: **Sidebar → Warehouse** (`/warehouse`)

### 26.1 Create a Warehouse

1. Click **+ New Warehouse**.
2. Enter Name and Location.
3. Save.

### 26.2 Goods Entry / Inward

Path: **Sidebar → Goods Entry**

Record incoming stock directly to a specific warehouse, linked to a purchase order.

### 26.3 Stock Transfer

Transfer stock between warehouses:
1. Select source and destination warehouse.
2. Select product and quantity.
3. Save — stock is deducted from source and added to destination.

---

## 27. Retail & POS

Path: **Sidebar → POS** (`/pos`)

### 27.1 Make a Sale

1. Scan or search products.
2. Adjust quantities.
3. Apply discount if needed.
4. Select payment method: Cash / Card / UPI.
5. Click **Charge** — receipt is generated instantly.

### 27.2 End of Day Summary

Click **EOD Report** to see total sales, cash collected, and transaction count for the day.

---

## 28. Batch Tracking & BOM

### 28.1 Batch Tracking

Path: **Sidebar → Batch Tracking** (`/batches`)

For products with expiry dates or lot numbers (pharmaceuticals, food, chemicals):
1. Create a **Batch** with lot number, manufacturing date, expiry date.
2. Link batches to inventory movements.
3. Get alerts for expiring batches.

### 28.2 Bill of Materials (BOM)

Path: **Sidebar → BOM / Work Orders** (`/bom`)

For manufacturing:
1. Click **+ New BOM**.
2. Select the **finished product**.
3. Add **raw materials** with quantities.
4. Save the BOM.

**To raise a Work Order:**
1. Open the BOM.
2. Click **Raise Work Order**.
3. Enter quantity to produce and target date.
4. Raw materials are auto-reserved from inventory.

---

## 29. Admin Panel

Path: **Sidebar → Admin Panel** (`/admin/dashboard`)

Only **OWNER** and **ADMIN** roles can access this.

### 29.1 Team Management

Path: `/admin/team`

**Invite a Team Member:**
1. Click **+ Invite Member**.
2. Enter their email.
3. Select a **Role**: Owner / Admin / Manager / Staff / Accountant / Viewer.
4. Choose a **Department Preset** (e.g. "Sales & CRM" auto-selects CRM, Dispatch, Accounts modules) — or manually pick individual modules.
5. Click **Send Invite**.
6. The user receives an email with an invitation link. Once they accept and register, they appear in the team list.

**Roles explained:**
- **OWNER** — Full access to everything, including billing
- **ADMIN** — All module access + team management
- **MANAGER** — Assigned modules + can approve requests
- **STAFF** — Assigned modules only
- **ACCOUNTANT** — Accounts + Finance modules
- **VIEWER** — Read-only on assigned modules

**Change a Member's Role or Modules:**
1. Click the member row.
2. Edit role or toggle individual module access.
3. Save changes.

**Remove a Member:**
Click the member → **Remove from Organisation**.

**Unlock a Locked Account:**
If a user's account is locked due to too many failed logins, click their row → **Unlock Account**.

### 29.2 Module Management

Path: `/admin/modules`

Enable or disable entire modules for your organisation. Disabled modules are hidden from the sidebar for all users.

### 29.3 Approval Queue

Path: `/admin/approvals`

Some actions (e.g. large purchase orders, payment requests) require admin approval. Review and approve/reject from this queue.

### 29.4 Organisation Settings

Path: `/admin/settings`

- Company Name, Logo, Address, GSTIN, PAN
- Currency, Timezone, Date Format
- Invoice prefix and number series

### 29.5 Audit Logs

Path: `/admin/logs`

Every action in the system is logged: who did what, when, from which IP. Use the search to filter by user, action type, or date range.

---

## 30. Security Center

Path: **Sidebar → Security** (`/security`)

### 30.1 Overview Tab

Shows a security dashboard with:
- Active member count
- Locked account count (with warning if any)
- Active API keys
- IP allowlist rule count
- Recent audit events

### 30.2 Sessions Tab

Lists all devices where your account is currently signed in.

**Revoke a session:**
Click **Revoke** next to any session to sign out that specific device immediately.

**Logout all other devices:**
Click **Logout all other devices** to revoke every session except your current one. Use this if you suspect your account was accessed by someone else.

### 30.3 API Keys Tab

API keys allow external applications to connect to your FlowCRM data programmatically.

**Create an API Key:**
1. Click **+ New API Key**.
2. Enter a name (e.g. "Zapier Integration").
3. Select **Scopes** — only grant the minimum permissions needed:
   - `leads:read` — read leads
   - `leads:write` — create/update leads
   - `crm:read` — read CRM contacts
   - `crm:write` — create/update contacts
   - `inventory:read` — read products/stock
   - `finance:read` — read invoices/payments
   - `all:read` — read-only access to everything
4. Set an optional **expiry** (recommended: 90 days).
5. Click **Create Key**.
6. **Copy the key immediately** — it is shown only once and never stored in plain text.

**Revoke a Key:**
Click **Revoke** next to the key. This immediately invalidates it.

**Using an API Key:**
Add the `Authorization: ApiKey <your-key>` header to your HTTP requests.

### 30.4 Password Tab

Change your password at any time:
1. Enter your **current password**.
2. Enter a **new password** — the strength meter shows real-time feedback.
   - Requirements: 8+ characters, 1 uppercase, 1 number, 1 special character.
3. **Confirm** the new password.
4. Click **Change Password**.

> You cannot reuse any of your last 5 passwords.

### 30.5 IP Allowlist Tab

Restrict which IP addresses can access your organisation.

> **Warning:** Once you add any rule, ALL other IPs are blocked. Always add your own current IP first.

**Add an IP Rule:**
1. Click **+ Add IP / CIDR**.
2. Enter an IP address (e.g. `203.0.113.45`) or CIDR range (e.g. `203.0.113.0/24`).
3. Add an optional label (e.g. "Office network").
4. Click **Add Rule**.

**Remove a Rule:**
Click **Remove** next to the rule to delete it.

### 30.6 Permissions Tab

Fine-grained control over what MEMBER-role users can do within each module.

> OWNER and ADMIN bypass all permission rules.

**Add a Permission Rule:**
1. Click **+ Add Rule**.
2. Select the **User** (from your team members).
3. Select the **Module** (CRM, Inventory, Accounts, etc.).
4. Check the allowed **Actions**: View / Edit / Delete / Export.
5. Click **Save Rule**.

**Example:** Give your accountant *view-only* access to Inventory:
- User: Accountant's name
- Module: INVENTORY
- Actions: View ✓ (Edit ✗, Delete ✗, Export ✗)

---

## 31. Settings

Path: **Sidebar → Settings** (`/settings`)

### 31.1 Organisation Profile
Update company name, logo, address, GSTIN, PAN, email, and phone.

### 31.2 SMTP Email Setup
Configure your outgoing email server:
- Host, Port, Username, Password
- From Name and From Email
- Click **Test Connection** to verify before saving.

### 31.3 GST Setup
Enter your GST credentials for e-Invoice and e-Way Bill generation.

### 31.4 Theme
Toggle between **Dark** and **Light** mode.

### 31.5 Currency

Path: **Sidebar → Currency** (`/currency`)

- Set your **base currency** (default: INR).
- Add other currencies with exchange rates for multi-currency invoicing.
- Rates can be updated manually or fetched automatically.

---

## 32. Webhooks

Path: **Sidebar → Webhooks** (`/webhooks`)

Webhooks let external systems (Zapier, n8n, custom apps) receive real-time notifications when events happen in FlowCRM.

### 32.1 Create a Webhook

1. Click **+ Add Webhook**.
2. Enter the **Endpoint URL** where events should be sent.
3. Enter a **Secret** (used to sign payloads — verify on your server with HMAC-SHA256).
4. Select **Events** to subscribe to:
   - `invoice.created`, `invoice.paid`, `invoice.cancelled`
   - `payment.received`
   - `contact.created`, `contact.updated`
   - `purchase_order.created`, `purchase_order.approved`
   - `lead.created`, `lead.converted`
   - `stock.low`
   - `work_order.completed`
5. Add an optional description.
6. Click **Save Webhook**.

### 32.2 Test a Webhook

Click **Test** on any webhook to fire a test payload to your endpoint.

### 32.3 Delivery History

Expand a webhook row to see all recent deliveries — HTTP status code, success/failure, and the full request/response payload.

### 32.4 Retry a Failed Delivery

Click the **retry icon** next to any failed delivery to resend it.

---

## 33. Super Admin (Platform Owner)

Path: `/super-admin` — Only accessible to the platform owner (the person who deployed FlowCRM).

Login at `/super-admin/login` with the super admin credentials set via environment variable.

### 33.1 Dashboard
Platform-wide metrics: total organisations, users, revenue, sign-ups over time.

### 33.2 Organisations
View all organisations on the platform. Click into any org to see their details, module usage, and member count. Can suspend or activate an org.

### 33.3 Users
View all users across all organisations. Can deactivate accounts, reset passwords, or unlock accounts.

---

## 34. Roles & Permissions Reference

| Role | Who should have it | Access summary |
|---|---|---|
| OWNER | Business owner | Everything including billing and super settings |
| ADMIN | Trusted manager/partner | Everything except platform billing |
| MANAGER | Department head | Assigned modules + team approvals |
| STAFF | Regular employee | Assigned modules only |
| ACCOUNTANT | Finance staff | Accounts, Finance, Reports |
| VIEWER | Auditor, investor, client | Read-only on assigned modules |

### Module Keys Reference

| Module Key | Page |
|---|---|
| CRM | Contacts & Companies |
| INVENTORY | Products & Stock |
| PURCHASE | Purchase Orders |
| STORE | Goods Entry (Inward) |
| DISPATCH | Sales Orders & Invoices |
| ACCOUNTS | Finance & Payments |
| POS | Retail / Point of Sale |
| WAREHOUSE | Warehouse Management |
| HR | HR & Payroll |
| PROJECTS | Projects & Tasks |
| MARKETING | Leads & CRM Pipeline |
| SUPPORT | Support Tickets |
| REPORTS | Analytics & Reports |
| IMPORT_EXPORT_SUITE | Trade / Import-Export |
| RETAIL_FASHION | Retail Operations |

---

## Quick Reference — Common Tasks

| Task | Path |
|---|---|
| Add a customer | CRM → + Add → Type: Customer |
| Create an invoice | Dispatch → + New Order |
| Add a lead | Marketing → + Add Lead |
| Log a call | Marketing → Lead → Log Activity → CALL |
| Send WhatsApp | WhatsApp → Send tab |
| Generate GST report | Sidebar → GST Reports |
| Generate e-Invoice | Sidebar → E-Invoice IRN |
| Invite a team member | Admin Panel → Team → + Invite |
| Change password | Security → Password tab |
| View active sessions | Security → Sessions tab |
| Create API key | Security → API Keys → + New |
| Set up automation | Automations → + New Rule |
| Share a lead form | Lead Forms → Copy URL |
| Create a budget | Budgets → + New Budget |
| Reconcile bank | Reconciliation → Import Statement |
| Add custom field | Custom Fields → select entity → + Add Field |
| Change brand colour | Branding → pick colour → Save |
| Enable TRAI compliance | Compliance → TRAI section → toggle ON |
| Register patient | Health → + New Patient |
| Log a trade call | Stock Market → Trade Calls → + New |
| Start a call campaign | Tele-calling → Campaigns → + New |

---

## 35. Custom Fields — Add Your Own Data Fields

Every business has unique data it needs to track. Custom Fields let you add your own fields to any module — without changing anything in the system.

### Examples of what businesses add

- Vehicle dealer → adds "Car Registration Number" to customers
- School → adds "Student Roll Number" to leads
- Gym → adds "Membership Plan" to contacts
- Pharma → adds "Drug License Number" to suppliers

### Create a Custom Field

1. Go to **Custom Fields** in the sidebar (under Settings section).
2. Use the **Entity** dropdown to select which module to add the field to:
   - Party (customers/suppliers), Lead, Invoice, Product, Employee, Ticket, Project, Patient, Purchase Order, Sales Order
3. Click **+ Add Field**.
4. Fill in:
   - **Label** — the name shown to users (e.g., "Reg. Number")
   - **Field Type** — choose from:
     - **Text** — any text input
     - **Number** — only numbers
     - **Date** — a date picker
     - **Yes/No** — a simple true/false dropdown
     - **Dropdown** — pick one from a list you define (enter options separated by commas)
     - **Multi-select** — pick multiple from a list
     - **URL** — a website link
     - **Email** — an email address
   - **Required** — tick this if users must fill it before saving a record
   - **Sort Order** — lower number = appears higher in the list
5. Click **Save**.

### Where Custom Fields Appear

After creating them, custom fields appear automatically on the right record:

- **Party (customer/supplier)** → open any party → go to the **Custom Fields** tab
- **Lead** → click Edit on any lead → custom fields appear below the standard form

Fill in values and click **Save Custom Fields**.

### Edit or Remove a Field

- Click the **pencil icon** on any field row to edit the label, options, or sort order.
- Click the **delete icon** to permanently remove the field and all its stored values.
- Toggle the **Active** switch to temporarily hide a field without deleting it.

---

## 36. Branding — Make It Look Like Your Business

Change the visual appearance of the system to match your company's colours and add your logo.

### Update Branding

1. Go to **Branding** in the sidebar.
2. **Brand Colour** — choose your company's primary colour:
   - Click one of the 10 preset colour swatches, or
   - Click the colour picker to choose any colour, or
   - Type a hex code directly (e.g., `#1a73e8`)
   - A preview shows how the colour looks on a button and logo badge
3. **Logo** — paste a direct URL to your company logo image (must be a public image URL, e.g., from your website)
4. **Invoice Settings** — these appear on every invoice you generate:
   - **Header** — text at the top of invoices (e.g., company tagline)
   - **Footer** — text at the bottom (e.g., "Goods once sold will not be taken back")
   - **Notes** — standard notes (e.g., bank account details for payment)
5. Click **Save Branding**.

The brand colour takes effect immediately across the app for your organisation.

---

## 37. Compliance — Stay Legally Safe in India

The Compliance module helps you follow key Indian regulations for data privacy, telecom, financial advisory, and healthcare.

### Access Compliance Settings

Go to **Compliance** in the sidebar.

---

### Section 1 — DPDP Act 2023 (Data Privacy)

India's Digital Personal Data Protection Act, 2023 requires businesses to handle personal data responsibly.

| Setting | What It Does |
|---------|-------------|
| **Consent Required** | Ask for explicit permission before saving someone's personal data |
| **Data Retention Days** | Automatically flag data older than this many days for deletion review |
| **Privacy Policy URL** | Link to your privacy policy page — shown to customers |
| **Terms URL** | Link to your terms and conditions |
| **Cookie Consent** | Show a cookie consent banner to website visitors |

**Export All Data:** Click the **Export My Data** button to download a full JSON file of everything the system holds about your organisation — useful if a regulator or customer requests it.

**Right to Erasure:** In the CRM, when a customer asks you to delete their data, open their party record and use the **Delete Personal Data** option. The system anonymises all their PII (name, phone, email, address, GSTIN, PAN) while keeping the invoice/transaction skeleton for audit purposes.

---

### Section 2 — TRAI (Telecom Regulatory Authority of India)

For businesses that do outbound calling or SMS marketing.

| Setting | What It Does |
|---------|-------------|
| **Restrict Calling Hours** | Prevents logging calls outside 9 AM–9 PM IST — mandatory under TRAI |
| **NDNC/DND Check Reminder** | Reminds your team to check the National Do Not Call registry before calling |

> You must also register on the **DLT platform** (Distributed Ledger Technology — required for bulk SMS). Register at your telecom operator's DLT portal (Airtel, Jio, Vodafone Idea, BSNL, or TRAI's own platform).

---

### Section 3 — SEBI (Financial Advisors Only)

For businesses that provide stock market advice to clients.

| Setting | What It Does |
|---------|-------------|
| **SEBI Registered** | Toggle ON if your firm holds a SEBI Investment Adviser (IA) licence |
| **SEBI Reg. Number** | Enter your IA registration number (e.g., INA000012345) |
| **Disclaimer Text** | Custom warning text shown on all stock advisory screens |

> **Warning:** Providing investment advice to clients without a SEBI IA licence is a criminal offence under SEBI (Investment Advisers) Regulations, 2013. Keep this module for internal records only until you are properly registered.

---

### Section 4 — Health Data (Clinics & Hospitals)

| Setting | What It Does |
|---------|-------------|
| **Health/HIPAA Mode** | Applies stricter access controls to patient records |
| **Patient Consent Required** | Requires documenting patient consent before storing their health data |

---

### Indian Compliance Checklist

At the bottom of the Compliance page, a table shows your status across 10 compliance areas:

| Area | What to Check |
|------|--------------|
| DPDP Consent | Consent collection is enabled |
| Data Retention | Retention policy is set |
| Privacy Policy | URL is filled in |
| TRAI Calling Hours | Calling hour restriction is ON |
| NDNC Check | DNC check reminder is ON |
| DLT Registration | Manual check (system cannot auto-verify) |
| GSTIN | Your GSTIN is saved in Settings |
| E-Invoicing | E-invoice module is active |
| Employee PF/ESI | Payroll deductions are configured |
| Data Export | Export feature is enabled |

Green tick = done. Amber warning = action needed.

---

## 38. Tele-calling Centre

For businesses with outbound sales or customer calling teams.

> **TRAI Notice:** All calls must be made between **9 AM and 9 PM IST** only. The system enforces this automatically when TRAI mode is turned on in Compliance settings.

### Your Daily Call Queue

1. Go to **Tele-calling** from the sidebar.
2. The top section shows today's stats: Total Calls, Connected, No Answer, Conversions.
3. Below that, your **call queue** lists leads assigned to you for today.

### Log a Call Result

After every call:
1. Find the lead in the queue and click **Log Call**.
2. Select the **Outcome**:
   - **Connected** — you spoke to them
   - **No Answer** — phone rang but no one picked up
   - **Busy** — line was busy
   - **Interested** — they want to know more (follow up!)
   - **Not Interested** — they said no
   - **Callback Requested** — they asked you to call back later
   - **Converted** — they agreed to buy / sign up
3. Add notes about what was discussed.
4. Set a **follow-up date** if they asked you to call back.
5. Save.

### Call Scripts

Keep your team consistent with pre-written scripts.

1. Click the **Scripts** tab.
2. Click **+ New Script**.
3. Write:
   - Opening line
   - Key points to cover
   - Common objections and how to handle them
   - Closing line / call to action
4. Save.

Scripts are visible to callers as a reference guide while they work through the queue.

### Do Not Call (DNC) List

The **DNC** tab shows all numbers marked as Do Not Call. Numbers are added here automatically when someone is marked DNC in the Leads module, or you can add numbers manually.

Callers will never see a Call button for DNC numbers — this protects your business from TRAI violations.

### Campaigns

Organise your calling work into campaigns (e.g., "June Follow-up Drive", "New Product Launch"):

1. Click **Campaigns** tab → **+ New Campaign**.
2. Give it a name and description.
3. Add leads to the campaign.
4. Assign to team members.
5. Track progress — how many called, how many connected, conversion rate.

---

## 39. Stock Market Advisory

For financial advisory firms that publish trade calls and research to clients.

> **SEBI Disclaimer:** Publishing trade recommendations to clients without a SEBI Investment Adviser licence is illegal in India. This module is for internal records only. Enable your registration details in Compliance settings.

### Trade Calls

1. Go to **Stock Market** from the sidebar.
2. Click **+ New Trade Call**.
3. Fill in:
   - **Symbol** — stock ticker (e.g., RELIANCE, INFY, TATASTEEL)
   - **Exchange** — NSE or BSE
   - **Call Type** — BUY or SELL
   - **Entry Price** — at what price to enter the trade
   - **Target Price** — where you expect it to go
   - **Stop-Loss** — where to exit if it goes wrong
   - **Time Horizon** — Intraday, Short-term, Medium-term, Long-term
   - **Rationale** — why you are recommending this trade
4. Save.

All trade calls are logged with date and time for your compliance records.

### Research Reports

Go to the **Research** tab:
1. Click **+ New Report**.
2. Enter:
   - Company name and sector
   - **Rating** — Strong Buy, Buy, Hold, Sell, Strong Sell
   - **Target Price** and **CMP** (current market price)
   - **Upside/Downside %**
   - Full research write-up
3. Save.

### Client Subscriptions

Go to the **Subscriptions** tab to track which clients are currently subscribed to your advisory service:
- Client name and contact
- Plan type and amount paid
- Subscription start and end date
- KYC status (verified / pending)

### Market Alerts

Go to the **Alerts** tab to set price-based alerts:
1. Click **+ New Alert**.
2. Enter the **Symbol** and **Trigger Price**.
3. Write the **Alert Message** (what to tell the client when this price is hit).
4. Save.

When the stock crosses the trigger price, the alert fires and is recorded in the system.

---

## 40. Health & Patient Management

For clinics, hospitals, dental offices, physiotherapy centres, and any healthcare provider.

> **Consent Note:** Always get patient consent before recording their health data. Enable Patient Consent in Compliance → Health section.

### Register a New Patient

1. Go to **Health** from the sidebar.
2. Click **+ New Patient**.
3. Fill in:
   - **Full Name** (required)
   - **Date of Birth**
   - **Gender**
   - **Blood Group** — A+, A-, B+, B-, O+, O-, AB+, AB-
   - **Known Allergies** — important for prescriptions
   - **Phone number** (for follow-up reminders)
   - **Emergency Contact** name and phone
   - **Address**
4. Click Save.

Each patient gets a unique Patient ID automatically.

### Search for a Patient

Use the **Search bar** at the top of the Health page to find patients by name or phone number. Click their name to open their full record.

### Log a Patient Visit

Each time a patient comes in:

1. Open the patient record.
2. Click **+ New Visit**.
3. Fill in:
   - **Visit Type** — OPD (walks in) or IPD (admitted)
   - **Date and Time**
   - **Chief Complaint** — in their own words (e.g., "fever for 3 days")
   - **Vital Signs:**
     - Blood Pressure (e.g., 120/80)
     - Pulse (beats per minute)
     - Temperature (°F or °C)
     - Weight (kg)
   - **Diagnosis** — doctor's diagnosis
   - **Next Follow-up Date** — when to come back
4. Save.

### Write a Prescription

Inside a visit record:
1. Click **+ Prescription**.
2. Add medicines:
   - Medicine name
   - Dosage (e.g., 500mg)
   - Frequency (e.g., Twice a day)
   - Duration (e.g., 5 days)
   - Instructions (e.g., "After food")
3. Add doctor's advice notes.
4. Click **Print** to print the prescription for the patient.

### Record Lab Results

Inside a visit record, click **+ Lab Report** to add test results:
- Test name (e.g., CBC, Blood Sugar, HbA1c)
- Result value and unit
- Normal range (for reference)
- Upload the lab report file if available

### Patient History

The patient's full visit history is visible on their profile — all visits, prescriptions, and lab reports in reverse chronological order.

---

*BL-CRM — Built for Indian businesses. For support, contact your system administrator.*
