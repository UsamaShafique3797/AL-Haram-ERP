import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  disabled?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">
          <img class="logo" src="/images/logo.png" alt="Al Haram Steel" />
          <div class="brand-text">
            <strong>Al-Haram ERP</strong>
            <span>Steel &amp; Construction</span>
          </div>
        </div>

        <nav>
          @for (group of nav; track group.title) {
            <div class="nav-group-title">{{ group.title }}</div>
            @for (item of group.items; track item.path) {
              <a [routerLink]="item.disabled ? null : item.path"
                 routerLinkActive="active"
                 [class.disabled]="item.disabled">
                <span class="ico">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
                @if (item.disabled) { <span class="soon">soon</span> }
              </a>
            }
          }
        </nav>
      </aside>

      <div class="main">
        <header class="topbar">
          <div class="spacer"></div>
          <div class="user">
            <div class="avatar">{{ initials() }}</div>
            <div class="user-meta">
              <strong>{{ auth.user()?.fullName }}</strong>
              <span>{{ auth.user()?.roles?.join(', ') }}</span>
            </div>
            <button class="btn btn-ghost btn-sm" (click)="logout()">Logout</button>
          </div>
        </header>

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; }
    .sidebar { width: 250px; background: #1f2933; color: #cbd2d9; display: flex; flex-direction: column;
      padding: 1.1rem .9rem; position: sticky; top: 0; height: 100vh; }
    .brand { display: flex; align-items: center; gap: .7rem; padding: .3rem .4rem 1.2rem; }
    .logo { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; background: #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,.25); }
    .brand-text { display: flex; flex-direction: column; line-height: 1.15; }
    .brand-text strong { color: #fff; font-size: .95rem; }
    .brand-text span { font-size: .72rem; color: var(--muted); }
    nav { display: flex; flex-direction: column; gap: .15rem; margin-top: .5rem; overflow-y: auto; }
    .nav-group-title { font-size: .65rem; text-transform: uppercase; letter-spacing: .08em;
      color: var(--muted); padding: .9rem .75rem .35rem; }
    nav a { display: flex; align-items: center; gap: .7rem; padding: .65rem .75rem; border-radius: 8px;
      color: #cbd2d9; font-size: .9rem; font-weight: 500; cursor: pointer; }
    nav a:hover { background: rgba(255,255,255,.06); color: #fff; }
    nav a.active { background: var(--brand); color: #fff; }
    nav a.disabled { opacity: .5; cursor: default; }
    nav a.disabled:hover { background: transparent; color: #cbd2d9; }
    .ico { width: 20px; text-align: center; }
    .soon { margin-left: auto; font-size: .6rem; background: rgba(255,255,255,.12); padding: .1rem .4rem; border-radius: 6px; }
    .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .topbar { height: 62px; background: var(--surface); border-bottom: 1px solid var(--line);
      display: flex; align-items: center; padding: 0 1.5rem; }
    .user { display: flex; align-items: center; gap: .75rem; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--brand); color: #fff;
      display: grid; place-items: center; font-weight: 700; font-size: .8rem; }
    .user-meta { display: flex; flex-direction: column; line-height: 1.2; }
    .user-meta strong { font-size: .85rem; }
    .user-meta span { font-size: .72rem; color: var(--muted); }
    .content { padding: 1.75rem; flex: 1; }
  `],
})
export class ShellComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  nav: NavGroup[] = [
    {
      title: 'Main',
      items: [{ label: 'Dashboard', path: '/dashboard', icon: '▦' }],
    },
    {
      title: 'Inventory',
      items: [
        { label: 'Items', path: '/inventory/items', icon: '▣' },
        { label: 'Categories', path: '/inventory/categories', icon: '◫' },
        { label: 'Units', path: '/inventory/units', icon: '⚖' },
        { label: 'Stock on hand', path: '/stock/levels', icon: '▥' },
        { label: 'Adjustments', path: '/stock/adjustments', icon: '⇅' },
        { label: 'Transfers', path: '/stock/transfers', icon: '⇄' },
      ],
    },
    {
      title: 'Production',
      items: [
        { label: 'Bill of materials', path: '/production/boms', icon: '⊞' },
        { label: 'Production orders', path: '/production/orders', icon: '⚙' },
        { label: 'Job work', path: '/production/job-work', icon: '⚒' },
      ],
    },
    {
      title: 'Parties',
      items: [
        { label: 'Customers', path: '/parties/customers', icon: '☺' },
        { label: 'Suppliers', path: '/parties/suppliers', icon: '⛬' },
      ],
    },
    {
      title: 'Sales',
      items: [
        { label: 'Invoices', path: '/sales/invoices', icon: '↗' },
        { label: 'Quotations', path: '/sales/quotations', icon: '✎' },
        { label: 'Delivery challans', path: '/sales/challans', icon: '🚚' },
        { label: 'Receipts', path: '/sales/receipts', icon: '₨' },
        { label: 'Returns', path: '/sales/returns', icon: '⟲' },
        { label: 'Receivables', path: '/sales/receivables', icon: '◷' },
        { label: 'Customer ledger', path: '/sales/ledger', icon: '☰' },
      ],
    },
    {
      title: 'Purchasing',
      items: [
        { label: 'Purchase invoices', path: '/purchasing/invoices', icon: '↘' },
        { label: 'Purchase orders', path: '/purchasing/orders', icon: '📋' },
        { label: 'GRN', path: '/purchasing/grns', icon: '📦' },
        { label: 'Supplier payments', path: '/purchasing/payments', icon: '₨' },
        { label: 'Purchase returns', path: '/purchasing/returns', icon: '⟲' },
        { label: 'Payables', path: '/purchasing/payables', icon: '◷' },
        { label: 'Supplier ledger', path: '/purchasing/ledger', icon: '☰' },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Expenses', path: '/expenses', icon: '₨' },
        { label: 'Cash book', path: '/finance/cash-book', icon: '▤' },
        { label: 'Day book', path: '/finance/day-book', icon: '☰' },
        { label: 'Reports', path: '/reports', icon: '◷' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { label: 'Godowns', path: '/settings/godowns', icon: '▤' },
        { label: 'Users', path: '/settings/users', icon: '⚇' },
        { label: 'Audit log', path: '/settings/audit-log', icon: '📜' },
        { label: 'Company', path: '/settings/company', icon: '⚙' },
      ],
    },
  ];

  initials(): string {
    const name = this.auth.user()?.fullName ?? '';
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
