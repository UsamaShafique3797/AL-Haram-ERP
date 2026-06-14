# 06 — Getting Started (Local Development)

## Prerequisites
- **.NET SDK 9** (installed)
- **Node.js 22 + Angular CLI 19** (installed)
- **SQL Server LocalDB** (installed — instance `MSSQLLocalDB`)

## Project layout

```
Al-Haram POS/
├── AlHaram.sln              # .NET solution
├── nuget.config            # uses nuget.org only
├── src/
│   ├── AlHaram.Domain/         # entities, enums, constants
│   ├── AlHaram.Application/     # DTOs, service interfaces
│   ├── AlHaram.Infrastructure/ # EF Core, Identity, services, migrations
│   └── AlHaram.Api/            # Web API (controllers, JWT, Swagger)
└── client/                 # Angular app
```

## Run the backend (API)

```powershell
dotnet run --project src/AlHaram.Api --launch-profile http
```

- API: `http://localhost:5227`
- Swagger UI: `http://localhost:5227/swagger`
- On first run it **creates the database, applies migrations, and seeds** roles,
  a default company, a default godown, and the admin user.

## Run the frontend (Angular)

```powershell
cd client
npm start
```

- App: `http://localhost:4200`

## Default login

| Username | Password   | Role  |
|----------|------------|-------|
| `admin`  | `Admin@123` | Owner |

> Change this password after first login (and rotate the JWT secret in
> `src/AlHaram.Api/appsettings.json` before any real deployment).

## What works in Phase 0
- Login / JWT auth, route guards, role-based access.
- Dashboard shell with navigation.
- Company settings (view/edit).
- Godowns (list / create / edit / delete).
- Users (list / create, assign roles).

## Database

Connection string (in `appsettings.json`):

```
Server=(localdb)\MSSQLLocalDB;Database=AlHaramDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True
```

### Add a migration (after changing entities)

```powershell
dotnet ef migrations add <Name> --project src/AlHaram.Infrastructure --startup-project src/AlHaram.Api --output-dir Persistence/Migrations
```

Migrations are applied automatically at API startup.

## Next phase
See [05-development-plan.md](05-development-plan.md) → **Phase 1: Inventory & Masters**.
