import { Routes } from '@angular/router';
import { authGuard, pathAccessGuard, routeAccessGuard } from './core/guards/auth.guard';

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
        canActivate: [routeAccessGuard('dashboard')],
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'inventory/items',
        canActivate: [routeAccessGuard('inventory/items')],
        loadComponent: () => import('./features/inventory/items.component').then((m) => m.ItemsComponent),
      },
      {
        path: 'inventory/categories',
        canActivate: [routeAccessGuard('inventory/categories')],
        loadComponent: () => import('./features/inventory/categories.component').then((m) => m.CategoriesComponent),
      },
      {
        path: 'inventory/units',
        canActivate: [routeAccessGuard('inventory/units')],
        loadComponent: () => import('./features/inventory/units.component').then((m) => m.UnitsComponent),
      },
      {
        path: 'stock/levels',
        canActivate: [routeAccessGuard('stock/levels')],
        loadComponent: () => import('./features/stock/stock-levels.component').then((m) => m.StockLevelsComponent),
      },
      {
        path: 'stock/adjustments',
        canActivate: [routeAccessGuard('stock/adjustments')],
        loadComponent: () => import('./features/stock/adjustments.component').then((m) => m.AdjustmentsComponent),
      },
      {
        path: 'stock/transfers',
        canActivate: [routeAccessGuard('stock/transfers')],
        loadComponent: () => import('./features/stock/stock-transfers.component').then((m) => m.StockTransfersComponent),
      },
      {
        path: 'parties/customers',
        canActivate: [routeAccessGuard('parties/customers')],
        loadComponent: () => import('./features/parties/customers.component').then((m) => m.CustomersComponent),
      },
      {
        path: 'parties/suppliers',
        canActivate: [routeAccessGuard('parties/suppliers')],
        loadComponent: () => import('./features/parties/suppliers.component').then((m) => m.SuppliersComponent),
      },
      {
        path: 'sales/invoices',
        canActivate: [routeAccessGuard('sales/invoices')],
        loadComponent: () => import('./features/sales/invoices.component').then((m) => m.InvoicesComponent),
      },
      {
        path: 'sales/invoices/:id/print',
        canActivate: [pathAccessGuard],
        loadComponent: () => import('./features/sales/invoice-print.component').then((m) => m.InvoicePrintComponent),
      },
      {
        path: 'sales/challans',
        canActivate: [routeAccessGuard('sales/challans')],
        loadComponent: () => import('./features/sales/delivery-challans.component').then((m) => m.DeliveryChallansComponent),
      },
      {
        path: 'sales/challans/:id/print',
        canActivate: [pathAccessGuard],
        loadComponent: () => import('./features/sales/challan-print.component').then((m) => m.ChallanPrintComponent),
      },
      {
        path: 'sales/quotations',
        canActivate: [routeAccessGuard('sales/quotations')],
        loadComponent: () => import('./features/sales/quotations.component').then((m) => m.QuotationsComponent),
      },
      {
        path: 'sales/quotations/:id/print',
        canActivate: [pathAccessGuard],
        loadComponent: () => import('./features/sales/quotation-print.component').then((m) => m.QuotationPrintComponent),
      },
      {
        path: 'sales/receipts',
        canActivate: [routeAccessGuard('sales/receipts')],
        loadComponent: () => import('./features/sales/receipts.component').then((m) => m.ReceiptsComponent),
      },
      {
        path: 'sales/returns',
        canActivate: [routeAccessGuard('sales/returns')],
        loadComponent: () => import('./features/sales/returns.component').then((m) => m.ReturnsComponent),
      },
      {
        path: 'sales/receivables',
        canActivate: [routeAccessGuard('sales/receivables')],
        loadComponent: () => import('./features/sales/receivables.component').then((m) => m.ReceivablesComponent),
      },
      {
        path: 'sales/ledger',
        canActivate: [routeAccessGuard('sales/ledger')],
        loadComponent: () => import('./features/sales/ledger.component').then((m) => m.LedgerComponent),
      },
      {
        path: 'purchasing/invoices',
        canActivate: [routeAccessGuard('purchasing/invoices')],
        loadComponent: () => import('./features/purchasing/purchase-invoices.component').then((m) => m.PurchaseInvoicesComponent),
      },
      {
        path: 'purchasing/orders',
        canActivate: [routeAccessGuard('purchasing/orders')],
        loadComponent: () => import('./features/purchasing/purchase-orders.component').then((m) => m.PurchaseOrdersComponent),
      },
      {
        path: 'purchasing/grns',
        canActivate: [routeAccessGuard('purchasing/grns')],
        loadComponent: () => import('./features/purchasing/grns.component').then((m) => m.GrnsComponent),
      },
      {
        path: 'purchasing/payments',
        canActivate: [routeAccessGuard('purchasing/payments')],
        loadComponent: () => import('./features/purchasing/supplier-payments.component').then((m) => m.SupplierPaymentsComponent),
      },
      {
        path: 'purchasing/returns',
        canActivate: [routeAccessGuard('purchasing/returns')],
        loadComponent: () => import('./features/purchasing/purchase-returns.component').then((m) => m.PurchaseReturnsComponent),
      },
      {
        path: 'purchasing/payables',
        canActivate: [routeAccessGuard('purchasing/payables')],
        loadComponent: () => import('./features/purchasing/payables.component').then((m) => m.PayablesComponent),
      },
      {
        path: 'purchasing/ledger',
        canActivate: [routeAccessGuard('purchasing/ledger')],
        loadComponent: () => import('./features/purchasing/supplier-ledger.component').then((m) => m.SupplierLedgerComponent),
      },
      {
        path: 'expenses',
        canActivate: [routeAccessGuard('expenses')],
        loadComponent: () => import('./features/expenses/expenses.component').then((m) => m.ExpensesComponent),
      },
      {
        path: 'expenses/categories',
        canActivate: [routeAccessGuard('expenses/categories')],
        loadComponent: () => import('./features/expenses/expense-categories.component').then((m) => m.ExpenseCategoriesComponent),
      },
      {
        path: 'finance/cash-book',
        canActivate: [routeAccessGuard('finance/cash-book')],
        loadComponent: () => import('./features/finance/cash-book.component').then((m) => m.CashBookComponent),
      },
      {
        path: 'finance/day-book',
        canActivate: [routeAccessGuard('finance/day-book')],
        loadComponent: () => import('./features/finance/day-book.component').then((m) => m.DayBookComponent),
      },
      {
        path: 'reports',
        canActivate: [routeAccessGuard('reports')],
        loadComponent: () => import('./features/reports/reports-hub.component').then((m) => m.ReportsHubComponent),
      },
      {
        path: 'reports/profit-loss',
        canActivate: [routeAccessGuard('reports/profit-loss')],
        loadComponent: () => import('./features/reports/profit-loss.component').then((m) => m.ProfitLossComponent),
      },
      {
        path: 'reports/sales',
        canActivate: [routeAccessGuard('reports/sales')],
        loadComponent: () => import('./features/reports/sales-report.component').then((m) => m.SalesReportComponent),
      },
      {
        path: 'reports/expenses',
        canActivate: [routeAccessGuard('reports/expenses')],
        loadComponent: () => import('./features/reports/expense-report.component').then((m) => m.ExpenseReportComponent),
      },
      {
        path: 'reports/purchases',
        canActivate: [routeAccessGuard('reports/purchases')],
        loadComponent: () => import('./features/reports/purchase-report.component').then((m) => m.PurchaseReportComponent),
      },
      {
        path: 'reports/stock-valuation',
        canActivate: [routeAccessGuard('reports/stock-valuation')],
        loadComponent: () => import('./features/reports/stock-valuation.component').then((m) => m.StockValuationComponent),
      },
      {
        path: 'reports/receivables-ageing',
        canActivate: [routeAccessGuard('reports/receivables-ageing')],
        loadComponent: () => import('./features/reports/receivables-ageing.component').then((m) => m.ReceivablesAgeingComponent),
      },
      {
        path: 'reports/payables-ageing',
        canActivate: [routeAccessGuard('reports/payables-ageing')],
        loadComponent: () => import('./features/reports/payables-ageing.component').then((m) => m.PayablesAgeingComponent),
      },
      {
        path: 'settings/company',
        canActivate: [routeAccessGuard('settings/company')],
        loadComponent: () => import('./features/settings/company.component').then((m) => m.CompanyComponent),
      },
      {
        path: 'settings/godowns',
        canActivate: [routeAccessGuard('settings/godowns')],
        loadComponent: () => import('./features/settings/godowns.component').then((m) => m.GodownsComponent),
      },
      {
        path: 'settings/users',
        canActivate: [routeAccessGuard('settings/users')],
        loadComponent: () => import('./features/settings/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'settings/audit-log',
        canActivate: [routeAccessGuard('settings/audit-log')],
        loadComponent: () => import('./features/settings/audit-log.component').then((m) => m.AuditLogComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
