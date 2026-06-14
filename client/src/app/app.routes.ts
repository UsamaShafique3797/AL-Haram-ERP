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
        path: 'parties/customers',
        loadComponent: () => import('./features/parties/customers.component').then((m) => m.CustomersComponent),
      },
      {
        path: 'parties/suppliers',
        loadComponent: () => import('./features/parties/suppliers.component').then((m) => m.SuppliersComponent),
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
    ],
  },
  { path: '**', redirectTo: '' },
];
