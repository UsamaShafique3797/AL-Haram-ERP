import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'inventory/items',
        loadComponent: () => import('./features/inventory/items.component').then((m) => m.ItemsComponent),
      },
      {
        path: 'inventory/categories',
        loadComponent: () => import('./features/inventory/categories.component').then((m) => m.CategoriesComponent),
      },
      {
        path: 'inventory/units',
        loadComponent: () => import('./features/inventory/units.component').then((m) => m.UnitsComponent),
      },
      {
        path: 'stock/levels',
        loadComponent: () => import('./features/stock/stock-levels.component').then((m) => m.StockLevelsComponent),
      },
      {
        path: 'stock/adjustments',
        loadComponent: () => import('./features/stock/adjustments.component').then((m) => m.AdjustmentsComponent),
      },
      {
        path: 'stock/transfers',
        loadComponent: () => import('./features/stock/stock-transfers.component').then((m) => m.StockTransfersComponent),
      },
      {
        path: 'production/boms',
        loadComponent: () => import('./features/production/boms.component').then((m) => m.BomsComponent),
      },
      {
        path: 'production/orders',
        loadComponent: () => import('./features/production/production-orders.component').then((m) => m.ProductionOrdersComponent),
      },
      {
        path: 'production/job-work',
        loadComponent: () => import('./features/production/job-work.component').then((m) => m.JobWorkComponent),
      },
      {
        path: 'parties/customers',
        loadComponent: () => import('./features/parties/customers.component').then((m) => m.CustomersComponent),
      },
      {
        path: 'parties/suppliers',
        loadComponent: () => import('./features/parties/suppliers.component').then((m) => m.SuppliersComponent),
      },
      {
        path: 'sales/invoices',
        loadComponent: () => import('./features/sales/invoices.component').then((m) => m.InvoicesComponent),
      },
      {
        path: 'sales/invoices/:id/print',
        loadComponent: () => import('./features/sales/invoice-print.component').then((m) => m.InvoicePrintComponent),
      },
      {
        path: 'sales/challans',
        loadComponent: () => import('./features/sales/delivery-challans.component').then((m) => m.DeliveryChallansComponent),
      },
      {
        path: 'sales/challans/:id/print',
        loadComponent: () => import('./features/sales/challan-print.component').then((m) => m.ChallanPrintComponent),
      },
      {
        path: 'sales/quotations',
        loadComponent: () => import('./features/sales/quotations.component').then((m) => m.QuotationsComponent),
      },
      {
        path: 'sales/receipts',
        loadComponent: () => import('./features/sales/receipts.component').then((m) => m.ReceiptsComponent),
      },
      {
        path: 'sales/returns',
        loadComponent: () => import('./features/sales/returns.component').then((m) => m.ReturnsComponent),
      },
      {
        path: 'sales/receivables',
        loadComponent: () => import('./features/sales/receivables.component').then((m) => m.ReceivablesComponent),
      },
      {
        path: 'sales/ledger',
        loadComponent: () => import('./features/sales/ledger.component').then((m) => m.LedgerComponent),
      },
      {
        path: 'purchasing/invoices',
        loadComponent: () => import('./features/purchasing/purchase-invoices.component').then((m) => m.PurchaseInvoicesComponent),
      },
      {
        path: 'purchasing/orders',
        loadComponent: () => import('./features/purchasing/purchase-orders.component').then((m) => m.PurchaseOrdersComponent),
      },
      {
        path: 'purchasing/grns',
        loadComponent: () => import('./features/purchasing/grns.component').then((m) => m.GrnsComponent),
      },
      {
        path: 'purchasing/payments',
        loadComponent: () => import('./features/purchasing/supplier-payments.component').then((m) => m.SupplierPaymentsComponent),
      },
      {
        path: 'purchasing/returns',
        loadComponent: () => import('./features/purchasing/purchase-returns.component').then((m) => m.PurchaseReturnsComponent),
      },
      {
        path: 'purchasing/payables',
        loadComponent: () => import('./features/purchasing/payables.component').then((m) => m.PayablesComponent),
      },
      {
        path: 'purchasing/ledger',
        loadComponent: () => import('./features/purchasing/supplier-ledger.component').then((m) => m.SupplierLedgerComponent),
      },
      {
        path: 'expenses',
        loadComponent: () => import('./features/expenses/expenses.component').then((m) => m.ExpensesComponent),
      },
      {
        path: 'expenses/categories',
        loadComponent: () => import('./features/expenses/expense-categories.component').then((m) => m.ExpenseCategoriesComponent),
      },
      {
        path: 'finance/cash-book',
        loadComponent: () => import('./features/finance/cash-book.component').then((m) => m.CashBookComponent),
      },
      {
        path: 'finance/day-book',
        loadComponent: () => import('./features/finance/day-book.component').then((m) => m.DayBookComponent),
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports-hub.component').then((m) => m.ReportsHubComponent),
      },
      {
        path: 'reports/profit-loss',
        loadComponent: () => import('./features/reports/profit-loss.component').then((m) => m.ProfitLossComponent),
      },
      {
        path: 'reports/sales',
        loadComponent: () => import('./features/reports/sales-report.component').then((m) => m.SalesReportComponent),
      },
      {
        path: 'reports/expenses',
        loadComponent: () => import('./features/reports/expense-report.component').then((m) => m.ExpenseReportComponent),
      },
      {
        path: 'reports/purchases',
        loadComponent: () => import('./features/reports/purchase-report.component').then((m) => m.PurchaseReportComponent),
      },
      {
        path: 'reports/stock-valuation',
        loadComponent: () => import('./features/reports/stock-valuation.component').then((m) => m.StockValuationComponent),
      },
      {
        path: 'reports/receivables-ageing',
        loadComponent: () => import('./features/reports/receivables-ageing.component').then((m) => m.ReceivablesAgeingComponent),
      },
      {
        path: 'reports/payables-ageing',
        loadComponent: () => import('./features/reports/payables-ageing.component').then((m) => m.PayablesAgeingComponent),
      },
      {
        path: 'settings/company',
        loadComponent: () => import('./features/settings/company.component').then((m) => m.CompanyComponent),
      },
      {
        path: 'settings/godowns',
        loadComponent: () => import('./features/settings/godowns.component').then((m) => m.GodownsComponent),
      },
      {
        path: 'settings/users',
        canActivate: [roleGuard('Owner', 'Manager')],
        loadComponent: () => import('./features/settings/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'settings/audit-log',
        canActivate: [roleGuard('Owner', 'Manager')],
        loadComponent: () => import('./features/settings/audit-log.component').then((m) => m.AuditLogComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
