import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SalesInvoiceService } from '../../core/services/sales-invoice.service';
import { CompanyService } from '../../core/services/company.service';
import { CustomerService } from '../../core/services/customer.service';
import { WhatsAppService } from '../../core/services/whatsapp.service';
import { CompanyDto, SalesInvoiceDto } from '../../core/models/domain.models';

@Component({
  selector: 'app-invoice-print',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  template: `
    <div class="screen-only no-print" style="margin-bottom:1rem; display:flex; gap:.5rem; flex-wrap:wrap;">
      <a class="btn btn-ghost" routerLink="/sales/invoices">← Back</a>
      <div style="flex:1"></div>
      <button class="btn btn-primary" (click)="print()">Print / Save PDF</button>
      <button class="btn btn-ghost" (click)="shareWhatsApp()" [disabled]="whatsAppSending()">
        {{ whatsAppSending() ? 'Opening…' : 'Share on WhatsApp' }}
      </button>
    </div>

    @if (whatsAppMessage()) {
      <div class="alert no-print alert-error" style="margin-bottom:1rem">{{ whatsAppMessage() }}</div>
    }
    @if (whatsAppHint()) {
      <div class="alert no-print" style="margin-bottom:1rem;background:#f0f9ff;color:#026aa2;font-size:.85rem">{{ whatsAppHint() }}</div>
    }

    @if (invoice(); as i) {
      <div class="invoice-paper">
        <header class="hdr">
          <div class="brand-row">
            <img src="/images/logo.png" alt="Al Haram Steel" class="logo" />
            <div>
              <h1>{{ company()?.name || 'Al-Haram Steel' }}</h1>
              @if (company()?.address) { <div class="muted">{{ company()?.address }}</div> }
              @if (company()?.phone) { <div class="muted">Phone: {{ company()?.phone }}</div> }
              @if (company()?.taxNumber) { <div class="muted">NTN: {{ company()?.taxNumber }}</div> }
            </div>
          </div>
          <div class="meta">
            <h2>Sales Invoice</h2>
            <div><strong>{{ i.number }}</strong></div>
            <div>Date: {{ i.date | date:'mediumDate' }}</div>
          </div>
        </header>

        <section class="parties">
          <div>
            <div class="lbl">Bill to</div>
            <div class="big">{{ i.customerName }}</div>
          </div>
          <div style="text-align:right">
            <div class="lbl">Godown</div>
            <div>{{ i.godownName }}</div>
          </div>
        </section>

        <table class="lines">
          <thead>
            <tr><th>#</th><th>Item</th><th class="num">Qty</th><th>Unit</th><th class="num">Rate</th><th class="num">Discount</th><th class="num">Amount</th></tr>
          </thead>
          <tbody>
            @for (l of i.lines; track l.id; let idx = $index) {
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
            <div class="trow"><span>Subtotal</span><span>{{ money(i.subtotal) }}</span></div>
            @if (i.discount) { <div class="trow"><span>Discount</span><span>− {{ money(i.discount) }}</span></div> }
            @if (i.taxRate) { <div class="trow"><span>Tax ({{ i.taxRate }}%)</span><span>{{ money(i.taxAmount) }}</span></div> }
            <div class="trow grand"><span>Total</span><span>{{ money(i.total) }}</span></div>
            @if (i.paidAmount) { <div class="trow"><span>Paid ({{ i.paymentAccountName }})</span><span>− {{ money(i.paidAmount) }}</span></div> }
            <div class="trow due" [class.settled]="i.balance <= 0">
              <span>Balance due</span><span>{{ money(i.balance) }}</span>
            </div>
          </div>
        </section>

        @if (i.notes) {
          <section class="notes">
            <div class="lbl">Notes</div>
            <div>{{ i.notes }}</div>
          </section>
        }

        <footer class="ftr">
          <div>Thank you for your business.</div>
          <div class="muted">{{ company()?.name }} · Currency: {{ company()?.currency || 'PKR' }}</div>
        </footer>
      </div>
    } @else if (loaded()) {
      <div class="card card-pad">Invoice not found.</div>
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
    .logo { width: 64px; height: 64px; border-radius: 50%; }
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
    .trow.due { font-weight: 700; color: #c0392b; }
    .trow.due.settled { color: #2f9e44; }
    .notes { margin-top: 1.25rem; padding-top: .75rem; border-top: 1px dashed #ced4da; font-size: .85rem; }
    .ftr { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ced4da;
      display: flex; justify-content: space-between; font-size: .8rem; color: #6c757d; }

    @media print {
      :host { background: #fff; }
      .no-print { display: none !important; }
      .invoice-paper { box-shadow: none; padding: 0; max-width: 100%; }
    }
  `],
})
export class InvoicePrintComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private invoiceService = inject(SalesInvoiceService);
  private companyService = inject(CompanyService);
  private customerService = inject(CustomerService);
  private whatsAppService = inject(WhatsAppService);

  invoice = signal<SalesInvoiceDto | null>(null);
  company = signal<CompanyDto | null>(null);
  customerPhone = signal<string | null>(null);
  loaded = signal(false);
  whatsAppSending = signal(false);
  whatsAppMessage = signal<string | null>(null);
  whatsAppHint = signal<string | null>(
    'Free WhatsApp: PDF downloads automatically, chat opens — attach the PDF and tap Send.',
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loaded.set(true); return; }

    this.invoiceService.getById(id).subscribe({
      next: (i) => {
        this.invoice.set(i);
        this.loaded.set(true);
        this.customerService.getAll().subscribe((customers) => {
          const c = customers.find((x) => x.id === i.customerId);
          this.customerPhone.set(c?.phone ?? null);
        });
      },
      error: () => this.loaded.set(true),
    });
    this.companyService.get().subscribe((c) => this.company.set(c));
  }

  num(v: number): string { return Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 }); }
  money(v: number): string {
    return 'Rs ' + Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  print(): void { window.print(); }

  async shareWhatsApp(): Promise<void> {
    const i = this.invoice();
    if (!i) return;
    this.whatsAppSending.set(true);
    this.whatsAppMessage.set(null);
    try {
      const err = await this.whatsAppService.shareInvoicePdf(
        i,
        this.customerPhone(),
        this.company()?.name ?? 'Al-Haram Steel',
      );
      if (err) this.whatsAppMessage.set(err);
    } catch {
      this.whatsAppMessage.set('Could not download invoice PDF.');
    } finally {
      this.whatsAppSending.set(false);
    }
  }
}
