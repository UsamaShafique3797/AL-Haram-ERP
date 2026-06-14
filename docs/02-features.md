# 02 — Feature Documentation

This is the complete list of features. Each module says **what it does** and **why it matters
for a steel godown**. Features are tagged so you can plan the build:

- 🟢 **MVP** — must‑have for first usable version
- 🟡 **Phase 2** — important, comes soon after
- 🔵 **Phase 3+** — advanced / value‑add to make the system more effective

---

## 1. Inventory & Stock Management

### 1.1 Item / Product catalog 🟢
- Items grouped by **category** (Steel Bars, Rings/Stirrups, Pillars, Cement, Aggregates, Pipes, Sheets, Hardware…).
- Per item: code/SKU, name, category, brand, HS/tax code, default purchase rate, default sale rate, reorder level.
- **Steel‑specific attributes**: diameter (8/10/12/16/20/25 mm), grade (Grade 40/60), length (e.g., 40 ft), standard weight per piece.

### 1.2 Dual unit handling — weight ↔ piece 🟢
- Each item has a **base unit** (e.g., kg) and optional **secondary units** (piece, bundle, ton) with conversion factors.
- Sell 12mm bar by **piece** or by **kg/ton** — system converts automatically and keeps stock correct.
- Cement by **bag**, sand by **cft/ton**, rings by **piece/kg**.

### 1.3 Stock levels & valuation 🟢
- Live quantity on hand per item, per **godown**.
- Stock valuation by **Weighted Average Cost** (recommended for steel) — also supports FIFO.
- Stock value report = the money sitting in your godown.

### 1.4 Low‑stock & reorder alerts 🟡
- Reorder level per item; dashboard + notification when stock drops below it.
- Suggested purchase list.

### 1.5 Stock adjustments 🟢
- Record **wastage, damage, rust loss, theft, or counting corrections** with reason and approval.
- Keeps physical stock matching the system.

### 1.6 Opening stock & stock take 🟢
- Enter opening stock with cost when going live.
- **Physical stock take** screen: count, compare, post differences.

### 1.7 Multi‑godown / stock transfer 🔵
- Multiple storage locations; **transfer stock** between godowns with a transfer note.

---

## 2. Purchasing / Procurement

### 2.1 Supplier (vendor) management 🟢
- Supplier profile: name, contact, address, tax number, opening balance, credit terms.
- Per‑supplier ledger and outstanding balance (payables).

### 2.2 Purchase Order (PO) 🟡
- Raise PO to a supplier with items, quantities, agreed rates.
- Track status: Draft → Sent → Partially Received → Received → Closed.

### 2.3 Goods Received Note (GRN) 🟢
- Record what physically arrived (can be against a PO or direct).
- Updates stock and average cost immediately.

### 2.4 Purchase invoice / bill 🟢
- Supplier bill with items, tax, discount, and **landed costs** (freight, loading/unloading) distributed into item cost.
- Marks amount payable to supplier.

### 2.5 Purchase returns / debit notes 🟡
- Return defective/excess material to supplier; reduce stock and payable.

### 2.6 Supplier payments 🟢
- Pay suppliers (cash / bank / cheque), full or partial; auto‑allocate to bills; track balance.

---

## 3. Sales

### 3.1 Customer management 🟢
- Customers: retail walk‑ins, wholesale, and **contractors/builders**.
- Profile: contact, address, tax number, **credit limit**, payment terms, opening balance.
- Per‑customer ledger and outstanding (receivables).

### 3.2 Quotation / estimate 🟡
- Make a price quote; convert to invoice with one click. Useful for contractors comparing rates.

### 3.3 Sales invoice (cash & credit) 🟢
- Fast counter billing: pick item, choose unit (piece/kg), qty, rate, discount, tax.
- Cash or **credit (udhaar)** sale; partial payment at time of sale.
- Print / PDF / share on **WhatsApp**.

### 3.4 Delivery challan 🟡
- Goods‑out document, with vehicle number; can be billed later or linked to an invoice.

### 3.5 Sales returns / credit notes 🟡
- Take back returned material; restock and reduce customer balance.

### 3.6 Customer payments / receipts 🟢
- Receive payments (cash / bank / cheque), allocate to invoices, track outstanding.

### 3.7 Price lists & daily rate management 🟡
- Maintain **wholesale vs retail** price lists.
- **Daily steel rate update** — steel prices move often; update today's rate once and it flows to new invoices.

---

## 4. Production / Fabrication (rings & pillars) 🔵

> This is what makes the system fit *your* business specifically.

### 4.1 Bill of Materials (BOM)
- Define how a finished item is made, e.g. *“1000 stirrups (8mm, 6"×6") = X kg of 8mm wire + labor.”*

### 4.2 Production / job order
- Create a production order: consume raw steel from stock, produce finished rings/pillars into stock.
- System calculates **finished‑goods cost** = raw material cost + labor + overhead.

### 4.3 Job work for customers
- A customer brings steel for **cutting / bending**; charge for service only, track their material separately.

### 4.4 Scrap / off‑cut tracking
- Record steel scrap produced and its resale value.

---

## 5. Expenses Management

### 5.1 Expense recording 🟢
- Record expenses against **categories**: godown rent, salaries, electricity, fuel/transport,
  loading–unloading labor, repairs, tea/misc, office, taxes.
- Paid from cash or bank; attach a photo of the receipt.

### 5.2 Recurring expenses 🟡
- Auto‑remind/auto‑create monthly fixed expenses (rent, salaries).

### 5.3 Petty cash 🟡
- Track a small cash float for day‑to‑day spends.

---

## 6. Cash, Bank & Accounting

### 6.1 Cash book & bank book 🟢
- Every cash/bank in and out in one running statement; daily closing balance.

### 6.2 Customer & supplier ledgers 🟢
- Full statement per party; share statement on WhatsApp/PDF.

### 6.3 Cheque management 🟡
- Track post‑dated cheques (received & issued), due dates, cleared/bounced status.

### 6.4 Chart of accounts & journal 🔵
- Light double‑entry foundation so financial statements are accurate.

### 6.5 Day book 🟢
- One screen: all transactions of a day (sales, purchases, payments, expenses).

---

## 7. Reports & Analytics

### 7.1 Dashboard (KPIs) 🟢
- Today/this month: sales, purchases, expenses, cash in hand, bank balance, receivables, payables, **profit**.
- Charts: sales trend, top items, top customers, stock value.

### 7.2 Profit & Loss 🟢
- True P&L for any period = Sales − COGS − Expenses.
- Drill down by **product, category, customer, or salesman**.

### 7.3 Sales & purchase reports 🟢
- By date, item, customer/supplier, category; with quantity and value.

### 7.4 Stock reports 🟢
- Stock on hand, stock valuation, item movement (in/out), slow/non‑moving items.

### 7.5 Receivables & payables ageing 🟡
- Who owes how much, and how old (0–30 / 31–60 / 60+ days). Drives collections.

### 7.6 Tax / sales‑tax report 🟡
- Output tax on sales, input tax on purchases, net payable — ready for filing.

### 7.7 Expense report & profit by month 🟢
- Expense breakdown by category; month‑on‑month profit comparison.

### 7.8 Export 🟡
- Every report exportable to **Excel / PDF**.

---

## 8. Platform, Security & Admin

### 8.1 Users, roles & permissions 🟢
- Role‑based access (Owner, Manager, Salesman, Store keeper, Accountant) — control who sees/does what.

### 8.2 Audit log 🟡
- Who created/edited/deleted what, and when (important for cash businesses).

### 8.3 Company & tax settings 🟢
- Company profile, logo, invoice format/numbering, tax %, units, godowns.

### 8.4 Backup & restore 🟡
- Scheduled database backups; restore option.

### 8.5 Mobile‑friendly / PWA 🟡
- Responsive UI; owner can check dashboard and approve from a phone.

---

## 9. Value‑add features (make it more effective) 🔵

These go beyond basic bookkeeping and are especially useful for a steel/construction business:

| Feature | Benefit |
|---------|---------|
| **WhatsApp / SMS notifications** | Send invoices, payment reminders, and ledger statements automatically. |
| **Automated payment reminders** | Nudge customers with overdue udhaar — improves cash flow. |
| **Barcode / QR on items & invoices** | Faster counter billing and stock counts. |
| **Weighbridge / weight slip capture** | For bulk steel sold by weight: record truck weight in/out, attach slip. |
| **Vehicle & delivery tracking** | Assign deliveries to vehicles/drivers, track challan status. |
| **Salesman commission** | Auto‑calculate commission on sales/collections. |
| **Discount & scheme rules** | Volume discounts for wholesale/contractors. |
| **Multi‑godown & branch** | Grow to more locations without changing systems. |
| **e‑Invoice / e‑Way bill ready** | Structure data so statutory e‑invoicing can be plugged in. |
| **Document attachments** | Store bill photos, cheque images, agreements per transaction. |
| **Approval workflows** | Require manager approval for big discounts, write‑offs, or purchases. |
| **Customer/supplier statement on demand** | One‑tap shareable ledger PDF. |
| **Dead‑stock & price‑margin alerts** | Flag items not moving or sold below cost. |

---

## Out of scope (for now)

- Full statutory double‑entry accounting / external accountant audit pack (a light ledger is included; full GL is Phase 3+).
- Payroll/HR management (only salary *expense* recording is included).
- E‑commerce / online customer storefront.

> These can be added later — the data model is designed not to block them.
