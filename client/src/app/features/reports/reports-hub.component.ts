import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { REPORT_LINKS } from '../../core/auth/app-roles';
import { canAccessRoute } from '../../core/auth/role-access';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reports-hub',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1 class="page-title">Reports</h1>
    <p class="page-sub">Financial and operational reports with print and CSV export.</p>

    <div class="grid">
      @for (link of visibleLinks(); track link.path) {
        <a class="card card-pad link-card" [routerLink]="link.path">
          <h3>{{ link.title }}</h3>
          <p>{{ link.description }}</p>
        </a>
      }
    </div>
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .link-card { text-decoration: none; color: inherit; transition: box-shadow .15s; }
    .link-card:hover { box-shadow: var(--shadow-lg, 0 4px 12px rgba(0,0,0,.12)); }
    .link-card h3 { font-size: 1rem; margin-bottom: .35rem; }
    .link-card p { font-size: .8rem; color: var(--muted); margin: 0; }
  `],
})
export class ReportsHubComponent {
  private auth = inject(AuthService);

  visibleLinks = computed(() => {
    const roles = this.auth.user()?.roles ?? [];
    return REPORT_LINKS.filter((link) => canAccessRoute(roles, link.routeKey));
  });
}
