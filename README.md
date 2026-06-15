# Al-Haram ERP — Steel & Construction Business Management

A web-based **ERP** to manage a steel godown / construction materials business end‑to‑end:
inventory, purchasing, sales, expenses, payments, and full profit & loss reporting.

Built with **ASP.NET Core (.NET 9) Web API** and **Angular 19**, backed by **SQL Server**.

---

## Status — Phases 0–6 complete ✅

**Phases 0–6 (MVP + production + core value-add)** are implemented end-to-end.

- **Default login:** `admin` / `Admin@123`

### Phase 0 — Foundation
- JWT auth, roles, company/godowns/users, Swagger, **CI workflow**, **Docker**

### Phase 1 — Inventory
- Items, categories, units, stock, adjustments, customers, suppliers

### Phase 2 — Sales
- Invoices, print/PDF, **WhatsApp share**, receipts, ledger, receivables, returns, **delivery challans**, **quotations**

### Phase 3 — Purchasing
- Purchase invoices, **purchase orders**, **GRN**, payments, returns, payables, supplier ledger

### Phase 4 — Finance & P&L
- Expenses with **file upload**, cash/day book, dashboard KPIs, P&L, reports with **CSV export**, **ageing**

### Phase 5 — Production
- BOMs, production orders with **scrap tracking**, **job work orders**

### Phase 6 — Value-add (core)
- Receivables/payables ageing, audit log, stock transfers (multi-godown)

### Not yet implemented (Phase 7 / optional)
- Full double-entry GL, e-invoice, weighbridge, barcode, automated WhatsApp reminders, PWA

---

## Documentation

| # | Document |
|---|----------|
| 1 | [docs/01-overview.md](docs/01-overview.md) |
| 2 | [docs/02-features.md](docs/02-features.md) |
| 3 | [docs/03-architecture.md](docs/03-architecture.md) |
| 4 | [docs/04-data-model.md](docs/04-data-model.md) |
| 5 | [docs/05-development-plan.md](docs/05-development-plan.md) |
| 6 | [docs/06-getting-started.md](docs/06-getting-started.md) |

---

## Run locally

See [docs/06-getting-started.md](docs/06-getting-started.md).

```powershell
dotnet run --project src/AlHaram.Api --launch-profile http
cd client; npm start
```

## Docker

```powershell
docker compose up --build
```

API: `http://localhost:5227` · Client: `http://localhost:4200`
