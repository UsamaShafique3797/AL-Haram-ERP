import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DeliveryChallanService } from '../../core/services/remaining-features.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { DeliveryChallanDto } from '../../core/models/domain.models';

@Component({
  selector: 'app-challan-print',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  template: `
    <div class="screen-only no-print" style="margin-bottom:1rem; display:flex; gap:.5rem;">
      <a class="btn btn-ghost" routerLink="/sales/challans">← Back</a>
      <div style="flex:1"></div>
      <button class="btn btn-primary" (click)="print()">Print / Save PDF</button>
    </div>

    @if (challan(); as c) {
      <div class="invoice-paper">
        <header class="hdr">
          <div class="brand-row">
            <img [src]="companyCtx.logoSrc()" [alt]="companyCtx.name()" class="logo" />
            <div>
              <h1>{{ companyCtx.name() }}</h1>
              @if (companyCtx.tagline()) { <div class="tagline">{{ companyCtx.tagline() }}</div> }
              @if (companyCtx.company()?.address) { <div class="muted">{{ companyCtx.company()?.address }}</div> }
              @if (companyCtx.company()?.phone) { <div class="muted">Phone: {{ companyCtx.company()?.phone }}</div> }
            </div>
          </div>
          <div class="meta">
            <h2>Delivery Challan</h2>
            <div><strong>{{ c.number }}</strong></div>
            <div>Date: {{ c.date | date:'mediumDate' }}</div>
          </div>
        </header>

        <section class="parties">
          <div>
            <div class="lbl">Deliver to</div>
            <div class="big">{{ c.customerName }}</div>
          </div>
          <div style="text-align:right">
            <div class="lbl">From godown</div>
            <div>{{ c.godownName }}</div>
            @if (c.vehicleNo) { <div class="muted">Vehicle: {{ c.vehicleNo }}</div> }
            @if (c.driverName) { <div class="muted">Driver: {{ c.driverName }}</div> }
          </div>
        </section>

        <table class="lines">
          <thead>
            <tr><th>#</th><th>Item</th><th class="num">Qty</th><th>Unit</th></tr>
          </thead>
          <tbody>
            @for (l of c.lines; track l.id; let idx = $index) {
              <tr>
                <td>{{ idx + 1 }}</td>
                <td>{{ l.itemName }} <span class="muted">({{ l.itemCode }})</span></td>
                <td class="num">{{ num(l.quantity) }}</td>
                <td>{{ l.unitCode }}</td>
              </tr>
            }
          </tbody>
        </table>

        @if (c.notes) {
          <section class="notes">
            <div class="lbl">Notes</div>
            <div>{{ c.notes }}</div>
          </section>
        }

        <footer class="ftr">
          <div>Received goods in good condition.</div>
          <div class="muted">{{ companyCtx.name() }}</div>
        </footer>
      </div>
    } @else if (loaded()) {
      <div class="card card-pad">Delivery challan not found.</div>
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
      table.lines { min-width: 480px; }
    }
    @media print {
      :host { background: #fff; }
      .no-print { display: none !important; }
      .invoice-paper { box-shadow: none; padding: 0; max-width: 100%; }
    }
  `],
})
export class ChallanPrintComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private challanService = inject(DeliveryChallanService);
  companyCtx = inject(CompanyContextService);

  challan = signal<DeliveryChallanDto | null>(null);
  loaded = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loaded.set(true); return; }

    this.challanService.getById(id).subscribe({
      next: (c) => { this.challan.set(c); this.loaded.set(true); },
      error: () => this.loaded.set(true),
    });
    this.companyCtx.refresh();
  }

  num(v: number): string {
    return Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 });
  }

  print(): void { window.print(); }
}
