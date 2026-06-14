# 05 — Development Plan

A phased plan that delivers a **usable system early**, then layers on advanced features.
Each phase ends with something you can actually use. Timeframes assume one focused developer;
they shrink with more people.

> Estimates are planning guidance, not commitments. We confirm scope per phase before starting.

---

## Phase 0 — Foundation & setup  *(~1 week)*
**Goal:** working skeleton both ends.

- [ ] Create .NET 8 solution (Api / Application / Domain / Infrastructure) + Git repo.
- [ ] Create Angular app shell with routing, layout, login page.
- [ ] Database + EF Core, base entity, migrations, seed data.
- [ ] Authentication: JWT login, roles, route guards, API authorization.
- [ ] Company & settings, godown, users — basic CRUD.
- [ ] CI build + Dockerfiles; Swagger live.

**Deliverable:** you can log in, see an empty dashboard, manage users & company settings.

---

## Phase 1 — Inventory & Masters (MVP core)  *(~2 weeks)*
**Goal:** the product catalog and stock truth.

- [ ] Categories, Units, Items with steel attributes (diameter, grade, length, weight/piece).
- [ ] Dual unit handling (weight ↔ piece conversions).
- [ ] Customers & Suppliers master with opening balances.
- [ ] Opening stock entry & stock valuation (weighted average).
- [ ] Stock list, item movement view, low‑stock indicator.
- [ ] Stock adjustments (wastage/damage/correction).

**Deliverable:** full catalog and accurate stock on hand with value.

---

## Phase 2 — Sales & Receivables (MVP core)  *(~2–3 weeks)*
**Goal:** start billing customers.

- [ ] Sales invoice (cash & credit), unit choice per line, discount, tax, multi‑item.
- [ ] Invoice print / PDF + share on WhatsApp.
- [ ] Customer receipts/payments with allocation to invoices.
- [ ] Customer ledger & outstanding (receivables).
- [ ] Sales returns / credit notes.
- [ ] Delivery challan.

**Deliverable:** you can sell, collect payments, and see who owes you money.

---

## Phase 3 — Purchasing & Payables (MVP core)  *(~2 weeks)*
**Goal:** record buying and supplier dues.

- [ ] Purchase invoice / bill with landed cost → updates stock & average cost.
- [ ] Goods Received Note (GRN).
- [ ] Supplier payments with allocation; supplier ledger & payables.
- [ ] Purchase returns / debit notes.
- [ ] Purchase orders (optional within this phase).

**Deliverable:** complete buy‑side; stock cost is now real.

---

## Phase 4 — Expenses, Cash/Bank & P&L (MVP completion)  *(~2 weeks)*
**Goal:** the numbers you asked for — expenses and profit/loss.

- [ ] Expense recording (categories, paid‑from account, receipt photo).
- [ ] Cash book & bank book; day book.
- [ ] **Dashboard** with KPIs (sales, purchases, expenses, cash, receivables, payables, profit).
- [ ] **Profit & Loss report** (period; drill‑down by item/category).
- [ ] Sales, purchase, stock, and expense reports + Excel/PDF export.

**Deliverable:** ✅ **First complete, usable system** — sell, buy, spend, and see true profit/loss.

---

## Phase 5 — Production / Fabrication  *(~2 weeks)*
**Goal:** model rings & pillars made in‑house.

- [ ] Bill of Materials (BOM) for finished items.
- [ ] Production orders: consume raw steel, produce finished goods, compute cost.
- [ ] Job work (customer‑supplied material) & scrap tracking.

**Deliverable:** accurate cost & stock for fabricated rings/pillars.

---

## Phase 6 — Value‑add & efficiency  *(~3–4 weeks, pick by priority)*
**Goal:** make it more effective.

- [ ] Quotations/estimates; price lists & daily rate management.
- [ ] Receivables/payables **ageing** + automated **payment reminders** (WhatsApp/SMS).
- [ ] Cheque management; recurring expenses; petty cash.
- [ ] Barcode/QR; salesman commission; discount/scheme rules.
- [ ] Tax/sales‑tax report; audit log; attachments everywhere.
- [ ] PWA polish for mobile owner use.

**Deliverable:** stronger cash flow, faster counter, better control.

---

## Phase 7 — Scale & compliance (as needed)  *(future)*
- [ ] Multi‑godown transfers & multi‑branch.
- [ ] Light double‑entry (chart of accounts, journal) for full financial statements.
- [ ] e‑Invoice / e‑Way bill integration.
- [ ] Weighbridge slip capture; vehicle/delivery tracking.
- [ ] Advanced analytics & forecasting.

---

## Suggested order of delivery

```
Phase 0 ─ Foundation
   │
Phase 1 ─ Inventory ──┐
Phase 2 ─ Sales       ├─►  MVP (you can run daily operations)
Phase 3 ─ Purchasing  │
Phase 4 ─ P&L/Reports ┘
   │
Phase 5 ─ Production (rings & pillars)
Phase 6 ─ Value-add (reminders, daily rates, etc.)
Phase 7 ─ Scale & compliance
```

**Rough total to MVP (Phases 0–4): ~9–10 weeks** solo; faster with a small team.
Production + value‑add (5–6): another ~5–6 weeks.

---

## How we'll work each phase

1. Confirm the phase's scope with you (this doc is the baseline).
2. Build backend (entities → migration → API → tests) then Angular screens.
3. Demo the working feature, collect your feedback, adjust.
4. Move to the next phase.

## Decisions needed before Phase 0

1. **Database:** SQL Server or PostgreSQL? *(default: SQL Server)*
2. **Hosting:** on‑premise/your PC, a VPS, or **Azure**? *(affects setup)*
3. **WhatsApp provider:** official WhatsApp Cloud API vs a gateway (Twilio etc.)?
4. **Tax:** exact sales‑tax % and whether invoices need a statutory format/number.
5. **Branding:** company name, logo, invoice layout, currency = PKR?

Once these are answered, we can start **Phase 0**.
