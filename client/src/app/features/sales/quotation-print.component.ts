import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { QuotationService } from '../../core/services/remaining-features.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { QuotationDto, QuotationStatusLabels } from '../../core/models/domain.models';

@Component({
  selector: 'app-quotation-print',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  template: `
    <div class="screen-only no-print" style="margin-bottom:1rem; display:flex; gap:.5rem; flex-wrap:wrap;">
      <a class="btn btn-ghost" routerLink="/sales/quotations">← Back</a>
      <div style="flex:1"></div>
      <button class="btn btn-primary" (click)="print()">Print / Save PDF</button>
    </div>

    @if (quote(); as q) {
      <div class="invoice-paper">
        <header class="hdr">
          <div class="brand-row">
            <img [src]="companyCtx.logoSrc()" [alt]="companyCtx.name()" class="logo" />
            <div>
              <h1>{{ companyCtx.name() }}</h1>
              @if (companyCtx.tagline()) { <div class="tagline">{{ companyCtx.tagline() }}</div> }
              @if (companyCtx.company()?.legalName) { <div class="muted">{{ companyCtx.company()?.legalName }}</div> }
              @if (companyCtx.company()?.address) { <div class="muted">{{ companyCtx.company()?.address }}</div> }
              @if (companyCtx.company()?.phone) { <div class="muted">Phone: {{ companyCtx.company()?.phone }}</div> }
              @if (companyCtx.company()?.email) { <div class="muted">{{ companyCtx.company()?.email }}</div> }
              @if (companyCtx.company()?.taxNumber) { <div class="muted">NTN: {{ companyCtx.company()?.taxNumber }}</div> }
            </div>
          </div>
          <div class="meta">
            <h2>Quotation</h2>
            <div><strong>{{ q.number }}</strong></div>
            <div>Date: {{ q.date | date:'mediumDate' }}</div>
            @if (q.validUntil) { <div>Valid until: {{ q.validUntil | date:'mediumDate' }}</div> }
            <div class="muted">{{ statusLabel(q.status) }}</div>
          </div>
        </header>

        <section class="parties">
          <div>
            <div class="lbl">Prepared for</div>
            <div class="big">{{ q.customerName }}</div>
          </div>
        </section>

        <table class="lines">
          <thead>
            <tr><th>#</th><th>Item</th><th class="num">Qty</th><th>Unit</th><th class="num">Rate</th><th class="num">Discount</th><th class="num">Amount</th></tr>
          </thead>
          <tbody>
            @for (l of q.lines; track l.id; let idx = $index) {
              <tr>
                <td>{{ idx + 1 }}</td>
                <td>{{ l.itemName }} <span class="muted">({{ l.itemCode }})</span></td>
                <td class="num">{{ num(l.quantity) }}</td>
                <td>{{ l.unitCode }}</td>
                <td class="num">{{ money(l.rate) }}</td>
                <td class="num">{{ money(l.discount) }}</td>
                <td class="num">{{ money(l.lineTotal) }}</td>
              </tr>
            }
          </tbody>
        </table>

        <section class="totals">
          <div class="totals-inner">
            <div class="trow"><span>Subtotal</span><span>{{ money(q.subtotal) }}</span></div>
            @if (q.discount) { <div class="trow"><span>Discount</span><span>− {{ money(q.discount) }}</span></div> }
            @if (q.taxRate) { <div class="trow"><span>Tax ({{ q.taxRate }}%)</span><span>{{ money(q.taxAmount) }}</span></div> }
            <div class="trow grand"><span>Total</span><span>{{ money(q.total) }}</span></div>
          </div>
        </section>

        @if (q.notes) {
          <section class="notes">
            <div class="lbl">Notes</div>
            <div>{{ q.notes }}</div>
          </section>
        }

        <footer class="ftr">
          <div>This quotation is valid until the date shown above and subject to stock availability.</div>
          <div class="muted">{{ companyCtx.name() }} · Currency: {{ companyCtx.company()?.currency || 'PKR' }}</div>
        </footer>
      </div>
    } @else if (loaded()) {
      <div class="card card-pad">Quotation not found.</div>
    } @else {
      <div class="card card-pad">Loading…</div>
    }
  `,
  styles: [`
    .invoice-paper { background: #fff; padding: 2rem; max-width: 880px; margin: 0 auto;
      box-shadow: 0 1px 3px rgba(16,24,40,.08); border-radius: 10px; color: #1f2933; }
    .hdr { display: flex; justify-content: space-between; align-items: flex-start; gap: 2rem;
      padding-bottom: 1rem; border-bottom: 2px solid #1f2933; }
    .brand-row { display: flex; gap: 1rem; align-items: center; }
    .logo { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; background: #fff; }
    .tagline { color: #495057; font-size: .85rem; margin-bottom: .15rem; }
    .hdr h1 { font-size: 1.4rem; margin: 0; color: #c0392b; }
    .hdr h2 { font-size: 1.1rem; margin: 0 0 .4rem; text-transform: uppercase; letter-spacing: .08em; }
    .meta { text-align: right; }
    .muted { color: #6c757d; font-size: .82rem; }
    .parties { display: flex; justify-content: space-between; margin: 1.25rem 0 1rem; }
    .lbl { font-size: .72rem; color: #8a94a0; text-transform: uppercase; letter-spacing: .08em; }
    .big { font-size: 1.05rem; font-weight: 600; }
    table.lines { width: 100%; border-collapse: collapse; margin: .5rem 0; }
    table.lines th { text-align: left; padding: .5rem .6rem; background: #f1f3f5; font-size: .75rem;
      text-transform: uppercase; letter-spacing: .04em; color: #495057; }
    table.lines td { padding: .55rem .6rem; border-bottom: 1px solid #e9ecef; font-size: .9rem; }
    .num { text-align: right; }
    .totals { display: flex; justify-content: flex-end; margin-top: 1rem; }
    .totals-inner { min-width: 280px; }
    .trow { display: flex; justify-content: space-between; padding: .25rem 0; font-size: .9rem; }
    .trow.grand { border-top: 1px solid #ced4da; border-bottom: 2px solid #1f2933;
      padding: .5rem 0; font-size: 1.05rem; font-weight: 700; }
    .notes { margin-top: 1.25rem; padding-top: .75rem; border-top: 1px dashed #ced4da; font-size: .85rem; }
    .ftr { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ced4da;
      display: flex; justify-content: space-between; font-size: .8rem; color: #6c757d; }

    @media (max-width: 700px) {
      .invoice-paper { padding: 1rem; border-radius: 0; overflow-x: auto; }
      .hdr { flex-direction: column; gap: 1rem; }
      .meta { text-align: left; }
      .brand-row { align-items: flex-start; }
      .parties { flex-direction: column; gap: .75rem; }
      .ftr { flex-direction: column; gap: .35rem; }
      table.lines { min-width: 520px; }
    }

    @media print {
      :host { background: #fff; }
      .no-print { display: none !important; }
      .invoice-paper { box-shadow: none; padding: 0; max-width: 100%; }
    }
  `],
})
export class QuotationPrintComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private quotationService = inject(QuotationService);
  companyCtx = inject(CompanyContextService);

  quote = signal<QuotationDto | null>(null);
  loaded = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loaded.set(true); return; }

    this.quotationService.getById(id).subscribe({
      next: (q) => { this.quote.set(q); this.loaded.set(true); },
      error: () => this.loaded.set(true),
    });
    this.companyCtx.refresh();
  }

  statusLabel(status: number): string { return QuotationStatusLabels[status] ?? String(status); }
  num(v: number): string { return Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 }); }
  money(v: number): string {
    return 'Rs ' + Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  print(): void { window.print(); }
}
