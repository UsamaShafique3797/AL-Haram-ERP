import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { APP_NAV } from '../core/auth/app-roles';
import { canAccessRoute } from '../core/auth/role-access';
import { AuthService } from '../core/services/auth.service';
import { BranchContextService } from '../core/services/branch-context.service';
import { GodownService } from '../core/services/godown.service';
import { GodownDto } from '../core/models/domain.models';

interface NavItem {
  label: string;
  path: string;
  icon: string;
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
          @for (group of visibleNav(); track group.title) {
            <div class="nav-group-title">{{ group.title }}</div>
            @for (item of group.items; track item.path) {
              <a [routerLink]="item.path"
                 routerLinkActive="active">
                <span class="ico">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </a>
            }
          }
        </nav>
      </aside>

      <div class="main">
        <header class="topbar">
          @if (auth.user()?.canAccessAllBranches) {
            <label class="branch-filter">
              <span class="branch-label">Branch</span>
              <select class="branch-select" [value]="branchCtx.selectedGodownId() ?? ''" (change)="onBranchChange($event)">
                <option value="">All branches</option>
                @for (g of godowns(); track g.id) {
                  <option [value]="g.id">{{ g.name }}</option>
                }
              </select>
            </label>
          } @else if (auth.user()?.godownName) {
            <span class="branch-badge">{{ auth.user()?.godownName }}</span>
          }
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
      display: flex; align-items: center; gap: 1rem; padding: 0 1.5rem; }
    .branch-filter { display: flex; align-items: center; gap: .5rem; }
    .branch-label { font-size: .75rem; font-weight: 600; color: var(--ink-soft); text-transform: uppercase; letter-spacing: .04em; }
    .branch-select { padding: .45rem .65rem; border: 1px solid var(--line); border-radius: 8px;
      font-size: .85rem; background: #fff; color: var(--ink); min-width: 160px; }
    .branch-badge { font-size: .8rem; font-weight: 600; color: var(--brand-dark);
      background: #fdecea; border: 1px solid #f5c6c0; padding: .35rem .75rem; border-radius: 999px; }
    .user { display: flex; align-items: center; gap: .75rem; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--brand); color: #fff;
      display: grid; place-items: center; font-weight: 700; font-size: .8rem; }
    .user-meta { display: flex; flex-direction: column; line-height: 1.2; }
    .user-meta strong { font-size: .85rem; }
    .user-meta span { font-size: .72rem; color: var(--muted); }
    .content { padding: 1.75rem; flex: 1; }
  `],
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  branchCtx = inject(BranchContextService);
  private godownService = inject(GodownService);
  private router = inject(Router);

  godowns = signal<GodownDto[]>([]);

  visibleNav = computed((): NavGroup[] => {
    const roles = this.auth.user()?.roles ?? [];
    return APP_NAV
      .map((group) => ({
        title: group.title,
        items: group.items
          .filter((item) => canAccessRoute(roles, item.routeKey))
          .map(({ label, path, icon }) => ({ label, path, icon })),
      }))
      .filter((group) => group.items.length > 0);
  });

  ngOnInit(): void {
    if (this.auth.user()?.canAccessAllBranches) {
      this.godownService.getAll().subscribe((list) => this.godowns.set(list));
    }
  }

  onBranchChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    const value = select.value;
    const name = value ? select.options[select.selectedIndex]?.text ?? null : null;
    this.branchCtx.setSelectedGodown(value || null, name);
    const url = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => this.router.navigateByUrl(url));
  }

  initials(): string {
    const name = this.auth.user()?.fullName ?? '';
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  }

  logout(): void {
    this.auth.logout();
    this.branchCtx.setSelectedGodown(null);
    this.router.navigate(['/login']);
  }
}
