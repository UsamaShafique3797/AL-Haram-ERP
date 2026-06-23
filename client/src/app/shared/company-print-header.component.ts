import { Component, inject, input } from '@angular/core';
import { CompanyContextService } from '../core/services/company-context.service';

@Component({
  selector: 'app-company-print-header',
  standalone: true,
  template: `
    <header class="print-header">
      <div class="brand-row">
        <img [src]="companyCtx.logoSrc()" [alt]="companyCtx.name()" class="logo" />
        <div class="brand-text">
          <div class="company-name">{{ companyCtx.name() }}</div>
          @if (companyCtx.tagline()) { <div class="tagline">{{ companyCtx.tagline() }}</div> }
          @if (companyCtx.company()?.address) { <div class="meta">{{ companyCtx.company()?.address }}</div> }
          @if (companyCtx.company()?.phone) { <div class="meta">Phone: {{ companyCtx.company()?.phone }}</div> }
          @if (companyCtx.company()?.email) { <div class="meta">{{ companyCtx.company()?.email }}</div> }
        </div>
      </div>
      <div class="report-title">
        <h2>{{ title() }}</h2>
        <ng-content />
      </div>
    </header>
  `,
  styles: [`
    .print-header { display: none; }
    .brand-row { display: flex; gap: 1rem; align-items: flex-start; margin-bottom: .75rem; }
    .logo { width: 56px; height: 56px; object-fit: contain; }
    .company-name { font-size: 1.1rem; font-weight: 700; }
    .tagline { color: #495057; font-size: .85rem; }
    .meta { color: #6c757d; font-size: .8rem; }
    .report-title h2 { margin: 0 0 .25rem; font-size: 1.25rem; }
    .report-title :ng-deep p { margin: 0; color: #495057; font-size: .9rem; }
    @media print {
      .print-header { display: block; margin-bottom: 1rem; border-bottom: 1px solid #dee2e6; padding-bottom: .75rem; }
    }
  `],
})
export class CompanyPrintHeaderComponent {
  companyCtx = inject(CompanyContextService);
  title = input.required<string>();
}
