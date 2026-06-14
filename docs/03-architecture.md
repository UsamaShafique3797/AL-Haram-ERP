# 03 — Architecture & Tech Stack

## Technology stack

### Backend — ASP.NET Core (.NET 8) Web API
- **.NET 8** Web API (REST, JSON).
- **Entity Framework Core 8** as ORM with migrations.
- **SQL Server** (recommended) — PostgreSQL also supported with no design changes.
- **JWT** authentication + refresh tokens; ASP.NET Core Identity for users/roles.
- **FluentValidation** for input validation, **AutoMapper** for DTO mapping.
- **Serilog** for logging, **Swagger / OpenAPI** for API docs.
- Background jobs (recurring expenses, reminders) via **Hangfire** or hosted services.

### Frontend — Angular
- **Angular (v17/18)**, standalone components + signals.
- **Angular Material** or **PrimeNG** for UI components (tables, forms, date pickers).
- **NgRx** (or signal store) for state; **RxJS** for data flows.
- Reactive forms, lazy‑loaded feature modules, **PWA** support for mobile use.
- Charts via **ngx-charts** / **ApexCharts**; PDF/Excel export client‑ or server‑side.

### Infrastructure
- Containerized with **Docker**; runs on Windows Server/IIS, Linux, or Azure App Service.
- Optional **Azure** hosting: App Service (API), Static Web Apps (Angular), Azure SQL, Blob Storage (attachments).

---

## Solution architecture (Clean / layered)

```
AlHaram.sln
│
├── src/
│   ├── AlHaram.Api            → ASP.NET Core Web API (controllers, auth, middleware)
│   ├── AlHaram.Application    → use-cases, services, DTOs, validation, interfaces
│   ├── AlHaram.Domain         → entities, enums, domain rules (no dependencies)
│   ├── AlHaram.Infrastructure → EF Core, repositories, DB, external services (WhatsApp/SMS, files)
│   └── AlHaram.Shared         → cross-cutting helpers, constants
│
├── tests/
│   ├── AlHaram.UnitTests
│   └── AlHaram.IntegrationTests
│
└── client/                    → Angular application
    └── src/app/
        ├── core/              → auth, interceptors, guards, api services
        ├── shared/            → reusable components, pipes, directives
        ├── features/          → inventory, purchasing, sales, expenses, reports, admin
        └── layout/            → shell, nav, dashboard
```

**Why layered/clean:** business rules (stock costing, P&L) live in Domain/Application and stay
testable and independent of the database or UI. Swapping SQL Server↔PostgreSQL or adding a mobile
app later does not touch business logic.

---

## Key technical design decisions

| Concern | Decision |
|--------|----------|
| **Stock costing** | Weighted Average Cost recalculated on each GRN/purchase; FIFO optional. |
| **Units** | Store stock in a single base unit; conversions applied at entry/display. Avoids rounding drift. |
| **Money** | `decimal(18,4)` for all money/quantity; never floating point. |
| **Numbering** | Configurable invoice/PO/GRN number series per document type & year. |
| **Soft delete + audit** | Records are soft‑deleted; `CreatedBy/At`, `UpdatedBy/At` on every entity. |
| **Multi‑godown** | `GodownId` on stock and transactions from day one (even if one godown today). |
| **Concurrency** | Row versioning to prevent two clerks overselling the same stock. |
| **Reporting** | Read‑optimized queries / SQL views for heavy reports; keep transactional tables clean. |
| **Security** | JWT + role/permission claims; server enforces permissions, not just the UI. |

---

## Integrations (pluggable)

- **WhatsApp** (Cloud API / provider like Twilio) for invoices, reminders, statements.
- **SMS / Email** for OTP and notifications.
- **File storage** (local disk or Azure Blob) for receipts, cheque images.
- **e‑Invoice / e‑Way bill** adapter interface (implement when needed for compliance).

Each integration sits behind an interface in `Application`, implemented in `Infrastructure`, so
the rest of the system doesn't depend on a specific provider.

---

## Non‑functional targets

- **Performance:** counter billing screen loads & saves in under ~1s on a normal connection.
- **Reliability:** automated nightly DB backups; transactions wrap stock + ledger updates.
- **Security:** hashed passwords, JWT expiry + refresh, HTTPS, role checks server‑side, audit log.
- **Usability:** keyboard‑friendly billing, works on desktop and mobile (PWA).
- **Maintainability:** layered code, unit tests on costing/P&L logic, Swagger‑documented API.
