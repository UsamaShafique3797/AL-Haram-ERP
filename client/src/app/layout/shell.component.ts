import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { APP_NAV, APP_QUICK_LINKS, QuickLinkDef } from '../core/auth/app-roles';
import { canAccessRoute } from '../core/auth/role-access';
import { AccessService } from '../core/services/access.service';
import { AuthService } from '../core/services/auth.service';
import { BranchContextService } from '../core/services/branch-context.service';
import { CompanyContextService } from '../core/services/company-context.service';
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
    <div class="layout" [class.nav-open]="navOpen()">
      @if (navOpen()) {
        <button type="button" class="sidebar-backdrop" aria-label="Close menu" (click)="closeNav()"></button>
      }

      <aside class="sidebar" [class.open]="navOpen()">
        <div class="brand">
          <img class="logo" [src]="companyCtx.logoSrc()" [alt]="companyCtx.name()" />
          <div class="brand-text">
            <strong>{{ companyCtx.sidebarTitle() }}</strong>
            @if (companyCtx.tagline()) {
              <span class="brand-tagline">{{ companyCtx.tagline() }}</span>
            }
          </div>
        </div>

        @if (visibleQuickLinks().length) {
          <div class="nav-quick">
            @for (link of visibleQuickLinks(); track link.path) {
              <a class="nav-quick-link"
                 [class.primary]="link.primary"
                 [routerLink]="link.path"
                 [queryParams]="quickParams(link)"
                 routerLinkActive="active"
                 (click)="closeNav()">
                <span class="ico">{{ link.icon }}</span>
                <span>{{ quickLabel(link) }}</span>
              </a>
            }
          </div>
        }

        <nav>
          @for (group of visibleNav(); track group.title) {
            <div class="nav-group-title">{{ group.title }}</div>
            @for (item of group.items; track item.path) {
              <a [routerLink]="item.path"
                 routerLinkActive="active"
                 (click)="closeNav()">
                <span class="ico">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </a>
            }
          }
        </nav>
      </aside>

      <div class="main">
        <header class="topbar">
          <button type="button" class="nav-toggle" aria-label="Open menu" (click)="toggleNav()">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

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
            <button class="btn btn-ghost btn-sm logout-btn" (click)="logout()">Logout</button>
          </div>
        </header>

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      max-width: 100%;
      overflow-x: clip;
    }

    .layout {
      display: flex;
      min-height: 100vh;
      width: 100%;
      max-width: 100vw;
      overflow-x: clip;
    }
    .sidebar-backdrop {
      display: none;
      border: none;
      padding: 0;
      cursor: pointer;
    }
    .sidebar { width: 250px; background: #1f2933; color: #cbd2d9; display: flex; flex-direction: column;
      padding: 1.1rem .9rem; position: sticky; top: 0; height: 100vh; flex-shrink: 0; z-index: 1001; }
    .brand { display: flex; align-items: center; gap: .7rem; padding: .3rem .4rem 1.2rem; }
    .logo { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; background: #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,.25); flex-shrink: 0; }
    .brand-text { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
    .brand-text strong { color: #fff; font-size: .95rem; word-break: break-word; }
    .brand-tagline { font-size: .75rem; color: #cbd2d9; margin-top: .15rem; line-height: 1.3; }
    nav { display: flex; flex-direction: column; gap: .15rem; margin-top: .5rem; overflow-y: auto; flex: 1; }
    .nav-quick {
      display: flex;
      flex-direction: column;
      gap: .35rem;
      padding: .15rem 0 .85rem;
      margin-bottom: .35rem;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .nav-quick-link {
      display: flex;
      align-items: center;
      gap: .65rem;
      padding: .7rem .75rem;
      border-radius: 8px;
      color: #fff;
      font-size: .9rem;
      font-weight: 600;
      background: rgba(192,57,43,.22);
      border: 1px solid rgba(192,57,43,.35);
    }
    .nav-quick-link:hover { background: rgba(192,57,43,.32); color: #fff; }
    .nav-quick-link.active { background: var(--brand); border-color: var(--brand); }
    .nav-quick-link:not(.primary) {
      background: rgba(255,255,255,.06);
      border-color: rgba(255,255,255,.1);
      font-weight: 500;
      color: #cbd2d9;
    }
    .nav-quick-link:not(.primary):hover { background: rgba(255,255,255,.1); color: #fff; }
    .nav-quick-link:not(.primary).active { background: var(--brand); border-color: var(--brand); color: #fff; }
    .nav-group-title { font-size: .65rem; text-transform: uppercase; letter-spacing: .08em;
      color: var(--muted); padding: .9rem .75rem .35rem; }
    nav a { display: flex; align-items: center; gap: .7rem; padding: .65rem .75rem; border-radius: 8px;
      color: #cbd2d9; font-size: .9rem; font-weight: 500; cursor: pointer; }
    nav a:hover { background: rgba(255,255,255,.06); color: #fff; }
    nav a.active { background: var(--brand); color: #fff; }
    .ico { width: 20px; text-align: center; flex-shrink: 0; }
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      width: 100%;
      max-width: 100%;
      overflow-x: clip;
    }
    .nav-toggle {
      display: none;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      padding: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      cursor: pointer;
      flex-shrink: 0;
    }
    .topbar {
      min-height: 62px;
      background: var(--surface);
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: .5rem 1rem;
      width: 100%;
      max-width: 100%;
      overflow: hidden;
      flex-wrap: nowrap;
    }
    .topbar .spacer { flex: 1 1 auto; min-width: 0; }
    .branch-filter { display: flex; align-items: center; gap: .5rem; min-width: 0; flex: 0 1 auto; max-width: min(280px, 40vw); }
    .branch-label { font-size: .75rem; font-weight: 600; color: var(--ink-soft); text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; }
    .branch-select { padding: .45rem .65rem; border: 1px solid var(--line); border-radius: 8px;
      font-size: .85rem; background: #fff; color: var(--ink); min-width: 0; max-width: 100%; flex: 1; }
    .branch-badge {
      font-size: .8rem;
      font-weight: 600;
      color: var(--brand-dark);
      background: #fdecea;
      border: 1px solid #f5c6c0;
      padding: .35rem .75rem;
      border-radius: 999px;
      min-width: 0;
      max-width: min(220px, 42vw);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex-shrink: 1;
    }
    .user { display: flex; align-items: center; gap: .5rem; min-width: 0; flex: 0 1 auto; max-width: 100%; overflow: hidden; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--brand); color: #fff;
      display: grid; place-items: center; font-weight: 700; font-size: .8rem; flex-shrink: 0; }
    .user-meta { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
    .user-meta strong { font-size: .85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .user-meta span { font-size: .72rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
    .logout-btn { flex-shrink: 0; }
    .content { padding: 1.75rem; flex: 1; min-width: 0; max-width: 100%; overflow-x: clip; }

    @media (max-width: 900px) {
      .layout { display: block; }
      .nav-toggle { display: inline-flex; }
      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        transform: translateX(-105%);
        transition: transform .25s ease, visibility .25s;
        box-shadow: none;
        width: min(280px, 88vw);
        visibility: hidden;
        pointer-events: none;
      }
      .sidebar.open {
        transform: translateX(0);
        box-shadow: 8px 0 32px rgba(0,0,0,.35);
        visibility: visible;
        pointer-events: auto;
      }
      .sidebar-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: rgba(15, 20, 26, .5);
      }
      .layout.nav-open { overflow: hidden; }
      .content { padding: 1rem; }
      .topbar {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        grid-template-areas: "toggle branch user";
        gap: .5rem;
        align-items: center;
        padding: .5rem .75rem;
      }
      .nav-toggle { grid-area: toggle; }
      .branch-filter,
      .branch-badge { grid-area: branch; min-width: 0; max-width: 100%; }
      .topbar .spacer { display: none; }
      .user { grid-area: user; justify-self: end; max-width: 100%; }
    }

    @media (max-width: 540px) {
      .user-meta { display: none; }
      .branch-label { display: none; }
      .logout-btn { padding: .35rem .55rem; }
    }
  `],
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  access = inject(AccessService);
  companyCtx = inject(CompanyContextService);
  branchCtx = inject(BranchContextService);
  private godownService = inject(GodownService);
  private router = inject(Router);

  godowns = signal<GodownDto[]>([]);
  navOpen = signal(false);

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

  visibleQuickLinks = computed((): QuickLinkDef[] => {
    const roles = this.auth.user()?.roles ?? [];
    return APP_QUICK_LINKS.filter((link) => canAccessRoute(roles, link.routeKey));
  });

  quickLabel(link: QuickLinkDef): string {
    return this.access.canWrite(link.routeKey) ? link.actionLabel : link.label;
  }

  quickParams(link: QuickLinkDef): Record<string, string> | null {
    return link.openNew && this.access.canWrite(link.routeKey) ? { new: '1' } : null;
  }

  ngOnInit(): void {
    this.companyCtx.refresh();
    if (this.auth.user()?.canAccessAllBranches) {
      this.godownService.getAll().subscribe((list) => this.godowns.set(list));
    }
  }

  toggleNav(): void {
    this.navOpen.update((v) => !v);
  }

  closeNav(): void {
    this.navOpen.set(false);
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
