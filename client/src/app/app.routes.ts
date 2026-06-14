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
