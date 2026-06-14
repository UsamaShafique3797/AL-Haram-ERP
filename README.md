# Al-Haram ERP — Steel & Construction Business Management

A web-based **ERP** to manage a steel godown / construction materials business end‑to‑end:
inventory, purchasing, sales, expenses, payments, and full profit & loss reporting.
(Includes point-of-sale style counter billing as one module within the larger ERP.)

Built with **ASP.NET Core (.NET 8) Web API** on the backend and **Angular** on the frontend,
backed by **SQL Server** (or PostgreSQL).

---

## What this system manages

- **Materials we sell** — TMT / steel bars (by diameter), steel rings & stirrups, pillars,
  pipes, angles, channels, sheets, cement, bricks, sand, aggregate, and any other construction material.
- **Purchasing** — suppliers, purchase orders, goods received, supplier bills, and supplier payments.
- **Sales** — customers (retail, wholesale, contractors), quotations, invoices, delivery challans, returns, and customer payments.
- **Expenses** — godown rent, salaries, electricity, transport/fuel, loading–unloading labor, maintenance, etc.
- **Money** — cash & bank, receivables (udhaar from customers), payables (to suppliers).
- **Profit & Loss** — true profit after cost of goods sold and all expenses, by day / month / product.

---

## Documentation

Read these in order:

| # | Document | What's inside |
|---|----------|---------------|
| 1 | [docs/01-overview.md](docs/01-overview.md) | Business problem, goals, glossary |
| 2 | [docs/02-features.md](docs/02-features.md) | **Full feature list** (core + value‑add) |
| 3 | [docs/03-architecture.md](docs/03-architecture.md) | Tech stack & system design |
| 4 | [docs/04-data-model.md](docs/04-data-model.md) | Entities, relationships, key fields |
| 5 | [docs/05-development-plan.md](docs/05-development-plan.md) | **Phased build plan & milestones** |
| 6 | [docs/06-getting-started.md](docs/06-getting-started.md) | **How to run the app locally** |

> Start with **Feature documentation (02)** to review what's being built, then the
> **Development plan (05)** for how and when it gets built.

---

## Status — Phase 0 complete ✅

The foundation is built and runs end-to-end:

- **Backend:** .NET 9 Web API (Domain / Application / Infrastructure / Api), EF Core + SQL Server,
  ASP.NET Identity, JWT auth, Swagger. Database auto-migrates and seeds on startup.
- **Frontend:** Angular 19 app with login, JWT interceptor, route guards, app shell, dashboard,
  and settings (company, godowns, users).
- **Default login:** `admin` / `Admin@123`

Run it: see [docs/06-getting-started.md](docs/06-getting-started.md).
**Next up:** Phase 1 — Inventory & item catalog.
