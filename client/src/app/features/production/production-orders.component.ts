import { Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductionOrderService } from '../../core/services/production-order.service';
import { BomService } from '../../core/services/bom.service';
import { GodownService } from '../../core/services/godown.service';
import { ItemService } from '../../core/services/item.service';
import { AccessService } from '../../core/services/access.service';
import {
  BillOfMaterialsDto,
  GodownDto,
  ItemDto,
  ProductionOrderDto,
  ProductionOrderStatus,
  ProductionOrderStatusLabels,
} from '../../core/models/domain.models';

@Component({
  selector: 'app-production-orders',
  standalone: true,
  imports: [ReactiveFormsModule, SlicePipe, DecimalPipe],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Production orders</h1>
        <p class="page-sub">Consume raw steel and produce finished goods with computed cost.</p>
      </div>
      <div class="spacer"></div>
      @if (access.canWrite('production/orders')) {
        <button class="btn btn-primary" (click)="openNew()" [disabled]="!ready()">+ New order</button>
      }
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead>
          <tr>
            <th>Number</th><th>Date</th><th>Finished item</th><th>Qty</th>
            <th>Status</th><th>Total cost</th><th></th>
          </tr>
        </thead>
        <tbody>
          @for (o of orders(); track o.id) {
            <tr>
              <td>{{ o.number }}</td>
              <td>{{ o.date | slice:0:10 }}</td>
              <td>{{ o.finishedItemName }}</td>
              <td>{{ o.quantity }}</td>
              <td><span class="badge" [class]="statusClass(o.status)">{{ statusLabel(o.status) }}</span></td>
              <td>{{ o.status === completed ? (o.totalCost | number:'1.2-2') : '—' }}</td>
              <td style="text-align:right">
                <button class="btn btn-ghost btn-sm" (click)="view(o)">View</button>
                @if (o.status === draft && access.canWrite('production/orders')) {
                  <button class="btn btn-ghost btn-sm" (click)="edit(o)">Edit</button>
                  <button class="btn btn-primary btn-sm" (click)="complete(o)">Complete</button>
                }
                @if (o.status === draft && access.canDelete('production/orders')) {
                  <button class="btn btn-ghost btn-sm" (click)="cancel(o)">Cancel</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" style="text-align:center;color:var(--muted)">No production orders yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>{{ editingId ? 'Edit production order' : 'New production order' }}</h3>
            @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:1">
                  <label>Godown</label>
                  <select formControlName="godownId">
                    <option value="">— select —</option>
                    @for (g of godowns(); track g.id) { <option [value]="g.id">{{ g.name }}</option> }
                  </select>
                </div>
                <div class="field" style="flex:1"><label>Date</label><input type="date" formControlName="date" /></div>
              </div>
              <div class="row">
                <div class="field" style="flex:2">
                  <label>BOM / finished item</label>
                  <select formControlName="billOfMaterialsId">
                    <option value="">— select —</option>
                    @for (b of activeBoms(); track b.id) {
                      <option [value]="b.id">{{ b.finishedItemName }} — {{ b.components.length }} components</option>
                    }
                  </select>
                </div>
                <div class="field" style="flex:1"><label>Output qty</label><input type="number" step="0.0001" formControlName="quantity" /></div>
                <div class="field" style="flex:1"><label>Labor &amp; overhead</label><input type="number" step="0.01" formControlName="laborOverhead" /></div>
              </div>
              <div class="row">
                <div class="field" style="flex:2">
                  <label>Scrap item (optional)</label>
                  <select formControlName="scrapItemId">
                    <option value="">— none —</option>
                    @for (it of items(); track it.id) { <option [value]="it.id">{{ it.name }}</option> }
                  </select>
                </div>
                <div class="field" style="flex:1"><label>Scrap qty (base units)</label><input type="number" step="0.0001" formControlName="scrapQuantity" /></div>
              </div>
              <div class="field"><label>Notes</label><input formControlName="notes" /></div>
              <div class="row" style="justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
                <button class="btn btn-primary" [disabled]="form.invalid || loading()">
                  {{ loading() ? 'Saving…' : (editingId ? 'Save changes' : 'Create draft') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }

    @if (selected()) {
      <div class="modal-backdrop" (click)="selected.set(null)">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>{{ selected()!.number }} — {{ selected()!.finishedItemName }}</h3>
            <p class="page-sub">
              {{ statusLabel(selected()!.status) }} · Qty {{ selected()!.quantity }} ·
              Labor/overhead {{ selected()!.laborOverhead | number:'1.2-2' }}
            </p>
            @if (selected()!.status === completed) {
              <div class="kpi-row">
                <div class="kpi"><span>Raw cost</span><strong>{{ selected()!.rawMaterialCost | number:'1.2-2' }}</strong></div>
                <div class="kpi"><span>Unit cost</span><strong>{{ selected()!.finishedUnitCost | number:'1.2-2' }}</strong></div>
                <div class="kpi"><span>Total cost</span><strong>{{ selected()!.totalCost | number:'1.2-2' }}</strong></div>
              </div>
            }
            <table class="table" style="margin-top:1rem">
              <thead><tr><th>Type</th><th>Item</th><th>Qty</th><th>Unit cost</th><th>Line cost</th></tr></thead>
              <tbody>
                @for (l of selected()!.lines; track l.id) {
                  <tr>
                    <td>{{ l.lineType === 1 ? 'Consume' : l.lineType === 2 ? 'Produce' : 'Scrap' }}</td>
                    <td>{{ l.itemName }}</td>
                    <td>{{ l.quantity }}</td>
                    <td>{{ l.unitCost | number:'1.2-2' }}</td>
                    <td>{{ l.lineCost | number:'1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <div class="row" style="justify-content:flex-end;margin-top:1rem">
              <button class="btn btn-ghost" (click)="selected.set(null)">Close</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop { position: fixed; inset: 0; background: rgba(16,24,40,.45);
      display: grid; place-items: center; padding: 1rem; z-index: 50; overflow:auto; }
    .modal { width: 100%; max-width: 820px; margin: auto; }
    .kpi-row { display: flex; gap: 1rem; margin-top: .75rem; }
    .kpi { background: var(--surface-2, #f8fafc); padding: .6rem .9rem; border-radius: 8px; flex: 1; }
    .kpi span { display: block; font-size: .72rem; color: var(--muted); }
    .kpi strong { font-size: 1rem; }
    .badge-draft { background: #fef3c7; color: #92400e; }
    .badge-done { background: #d1fae5; color: #065f46; }
    .badge-cancel { background: #f3f4f6; color: #6b7280; }
  `],
})
export class ProductionOrdersComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private orderService = inject(ProductionOrderService);
  private bomService = inject(BomService);
  private godownService = inject(GodownService);
  private itemService = inject(ItemService);

  orders = signal<ProductionOrderDto[]>([]);
  boms = signal<BillOfMaterialsDto[]>([]);
  godowns = signal<GodownDto[]>([]);
  items = signal<ItemDto[]>([]);
  ready = signal(false);

  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);
  selected = signal<ProductionOrderDto | null>(null);
  editingId: string | null = null;

  draft = ProductionOrderStatus.Draft;
  completed = ProductionOrderStatus.Completed;

  form = this.fb.nonNullable.group({
    godownId: ['', Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
    billOfMaterialsId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(0.0001)]],
    laborOverhead: [0, [Validators.required, Validators.min(0)]],
    scrapItemId: [''],
    scrapQuantity: [0, [Validators.min(0)]],
    notes: [''],
  });

  activeBoms = signal<BillOfMaterialsDto[]>([]);

  ngOnInit(): void {
    this.load();
    this.bomService.getAll().subscribe((list) => {
      this.boms.set(list);
      this.activeBoms.set(list.filter((b) => b.isActive));
    });
    this.godownService.getAll().subscribe((g) => { this.godowns.set(g); this.ready.set(true); });
    this.itemService.getAll().subscribe((list) => this.items.set(list));
  }

  load(): void {
    this.orderService.getAll().subscribe({
      next: (list) => this.orders.set(list),
      error: () => this.error.set('Could not load production orders.'),
    });
  }

  statusLabel(status: ProductionOrderStatus): string {
    return ProductionOrderStatusLabels[status] ?? String(status);
  }

  statusClass(status: ProductionOrderStatus): string {
    if (status === ProductionOrderStatus.Completed) return 'badge badge-done';
    if (status === ProductionOrderStatus.Cancelled) return 'badge badge-cancel';
    return 'badge badge-draft';
  }

  openNew(): void {
    this.editingId = null;
    this.formError.set(null);
    const defaultGodown = this.godowns().find((g) => g.isDefault) ?? this.godowns()[0];
    this.form.reset({
      godownId: defaultGodown?.id ?? '',
      date: new Date().toISOString().substring(0, 10),
      billOfMaterialsId: this.activeBoms()[0]?.id ?? '',
      quantity: 1,
      laborOverhead: 0,
      scrapItemId: '',
      scrapQuantity: 0,
      notes: '',
    });
    this.showForm.set(true);
  }

  edit(o: ProductionOrderDto): void {
    this.editingId = o.id;
    this.formError.set(null);
    this.form.reset({
      godownId: o.godownId,
      date: o.date.substring(0, 10),
      billOfMaterialsId: o.billOfMaterialsId,
      quantity: o.quantity,
      laborOverhead: o.laborOverhead,
      scrapItemId: o.scrapItemId ?? '',
      scrapQuantity: o.scrapQuantity ?? 0,
      notes: o.notes ?? '',
    });
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();
    const payload = {
      godownId: v.godownId,
      date: v.date,
      billOfMaterialsId: v.billOfMaterialsId,
      quantity: Number(v.quantity),
      laborOverhead: Number(v.laborOverhead),
      scrapItemId: v.scrapItemId || null,
      scrapQuantity: Number(v.scrapQuantity) || 0,
      notes: v.notes || null,
    };
    const req = this.editingId
      ? this.orderService.update(this.editingId, payload)
      : this.orderService.create(payload);
    req.subscribe({
      next: () => { this.loading.set(false); this.close(); this.load(); },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not create order.');
      },
    });
  }

  view(o: ProductionOrderDto): void {
    this.orderService.getById(o.id).subscribe({
      next: (detail) => this.selected.set(detail),
      error: () => this.error.set('Could not load order details.'),
    });
  }

  complete(o: ProductionOrderDto): void {
    if (!confirm(`Complete ${o.number}? Raw stock will be consumed and finished goods posted.`)) return;
    this.orderService.complete(o.id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err?.error?.errors?.[0] ?? 'Could not complete order.'),
    });
  }

  cancel(o: ProductionOrderDto): void {
    if (!confirm(`Cancel ${o.number}?`)) return;
    this.orderService.cancel(o.id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err?.error?.errors?.[0] ?? 'Could not cancel order.'),
    });
  }

  close(): void { this.showForm.set(false); this.editingId = null; }
}
