import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CustomerService } from '../../core/services/customer.service';
import { GodownService } from '../../core/services/godown.service';
import { ItemService } from '../../core/services/item.service';
import { DeliveryChallanService } from '../../core/services/remaining-features.service';
import { AccessService } from '../../core/services/access.service';
import { CustomerDto, DeliveryChallanDto, GodownDto, ItemDto } from '../../core/models/domain.models';

import { GridSearchBarComponent } from '../../shared/grid-search-bar.component';
import { filterByGridSearch, gridEmptyMessage } from '../../shared/grid-search.util';

@Component({
  selector: 'app-delivery-challans',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DatePipe, GridSearchBarComponent],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Delivery challans</h1>
        <p class="page-sub">Dispatch goods to customers without billing (stock out only).</p>
      </div>
      <div class="spacer"></div>
      @if (access.canWrite('sales/challans')) {
        <button class="btn btn-primary" (click)="openNew()" [disabled]="!ready()">+ New challan</button>
      }
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <app-grid-search-bar [value]="searchTerm()" (valueChange)="searchTerm.set($event)" placeholder="Search delivery challans…" />
      <table class="table">
        <thead>
          <tr><th>Number</th><th>Date</th><th>Customer</th><th>Godown</th><th>Lines</th><th></th></tr>
        </thead>
        <tbody>
          @for (c of filteredRows(); track c.id) {
            <tr>
              <td><a [routerLink]="['/sales/challans', c.id, 'print']">{{ c.number }}</a></td>
              <td>{{ c.date | date:'mediumDate' }}</td>
              <td>{{ c.customerName }}</td>
              <td>{{ c.godownName }}</td>
              <td>{{ c.lines.length }}</td>
              <td style="text-align:right">
                <a class="btn btn-ghost btn-sm" [routerLink]="['/sales/challans', c.id, 'print']">Print</a>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" style="text-align:center;color:var(--muted)">{{ emptyGridMessage('No delivery challans yet.') }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>New delivery challan</h3>
            @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }

            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:2">
                  <label>Customer</label>
                  <select formControlName="customerId">
                    <option value="">— select —</option>
                    @for (c of customers(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
                  </select>
                </div>
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
                <div class="field" style="flex:1"><label>Vehicle no.</label><input formControlName="vehicleNo" /></div>
                <div class="field" style="flex:1"><label>Driver</label><input formControlName="driverName" /></div>
              </div>

              <h4 style="margin:.25rem 0">Lines</h4>
              <div formArrayName="lines">
                @for (row of lines.controls; track $index; let idx = $index) {
                  <div class="row" [formGroupName]="idx" style="align-items:flex-end">
                    <div class="field" style="flex:2">
                      <label>Item</label>
                      <select formControlName="itemId" (change)="onItemChange(idx)">
                        <option value="">— select —</option>
                        @for (it of items(); track it.id) { <option [value]="it.id">{{ it.name }} ({{ it.code }})</option> }
                      </select>
                    </div>
                    <div class="field" style="flex:1">
                      <label>Unit</label>
                      <select formControlName="unitId">
                        @for (u of unitsFor(idx); track u.unitId) {
                          <option [value]="u.unitId">{{ u.unitCode }}</option>
                        }
                      </select>
                    </div>
                    <div class="field" style="flex:1"><label>Qty</label><input type="number" step="0.0001" formControlName="quantity" /></div>
                    <button type="button" class="btn btn-danger btn-sm" style="margin-bottom:1rem" (click)="removeLine(idx)">×</button>
                  </div>
                }
              </div>
              <button type="button" class="btn btn-ghost btn-sm" (click)="addLine()">+ Add line</button>

              <div class="field" style="margin-top:.75rem"><label>Notes</label><input formControlName="notes" /></div>

              <div class="row" style="justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
                <button class="btn btn-primary" [disabled]="form.invalid || lines.length === 0 || loading()">
                  {{ loading() ? 'Posting…' : 'Post challan' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop { position: fixed; inset: 0; background: rgba(16,24,40,.45);
      display: grid; place-items: flex-start; padding: 1rem; z-index: 50; overflow:auto; }
    .modal { width: 100%; max-width: 820px; margin: auto; }
    h4 { font-size: .9rem; }
  `],
})
export class DeliveryChallansComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private challanService = inject(DeliveryChallanService);
  private customerService = inject(CustomerService);
  private godownService = inject(GodownService);
  private itemService = inject(ItemService);
  private router = inject(Router);

  challans = signal<DeliveryChallanDto[]>([]);
  searchTerm = signal('');
  filteredRows = computed(() => filterByGridSearch(this.challans(), this.searchTerm()));
  customers = signal<CustomerDto[]>([]);
  godowns = signal<GodownDto[]>([]);
  items = signal<ItemDto[]>([]);
  ready = signal(false);
  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    customerId: ['', Validators.required],
    godownId: ['', Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
    vehicleNo: [''],
    driverName: [''],
    notes: [''],
    lines: this.fb.array<FormGroup>([]),
  });

  get lines(): FormArray { return this.form.get('lines') as FormArray; }


  emptyGridMessage = (defaultMessage: string) => gridEmptyMessage(this.searchTerm(), defaultMessage);
  ngOnInit(): void {
    this.load();
    forkJoin({
      customers: this.customerService.getAll(),
      godowns: this.godownService.getAll(),
      items: this.itemService.getAll(),
    }).subscribe(({ customers, godowns, items }) => {
      this.customers.set(customers.filter((c) => c.isActive));
      this.godowns.set(godowns);
      this.items.set(items.filter((i) => i.isActive));
      this.ready.set(true);
    });
  }

  load(): void {
    this.challanService.getAll().subscribe({
      next: (list) => this.challans.set(list),
      error: () => this.error.set('Could not load delivery challans.'),
    });
  }

  private lineGroup(): FormGroup {
    return this.fb.nonNullable.group({
      itemId: ['', Validators.required],
      unitId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.0001)]],
    });
  }

  addLine(): void { this.lines.push(this.lineGroup()); }
  removeLine(i: number): void { this.lines.removeAt(i); }

  unitsFor(idx: number): { unitId: string; unitCode: string }[] {
    const itemId = this.lines.at(idx).get('itemId')?.value;
    if (!itemId) return [];
    const item = this.items().find((i) => i.id === itemId);
    if (!item) return [];
    const base = { unitId: item.baseUnitId, unitCode: item.baseUnitCode };
    const extras = (item.units ?? [])
      .filter((u) => !u.isBaseUnit)
      .map((u) => ({ unitId: u.unitId, unitCode: u.unitCode }));
    return [base, ...extras];
  }

  onItemChange(idx: number): void {
    const row = this.lines.at(idx);
    const itemId = row.get('itemId')?.value;
    const item = this.items().find((i) => i.id === itemId);
    if (!item) return;
    row.patchValue({ unitId: item.baseUnitId });
  }

  openNew(): void {
    this.formError.set(null);
    const defaultGodown = this.godowns().find((g) => g.isDefault) ?? this.godowns()[0];
    this.lines.clear();
    this.form.reset({
      customerId: '',
      godownId: defaultGodown?.id ?? '',
      date: new Date().toISOString().substring(0, 10),
      vehicleNo: '',
      driverName: '',
      notes: '',
    });
    this.addLine();
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid || this.lines.length === 0) return;
    this.loading.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();

    this.challanService.create({
      date: v.date,
      customerId: v.customerId,
      godownId: v.godownId,
      vehicleNo: v.vehicleNo || null,
      driverName: v.driverName || null,
      notes: v.notes || null,
      lines: v.lines.map((l: any) => ({
        itemId: l.itemId,
        unitId: l.unitId,
        quantity: Number(l.quantity),
      })),
    }).subscribe({
      next: (saved) => {
        this.loading.set(false);
        this.close();
        this.load();
        this.router.navigate(['/sales/challans', saved.id, 'print']);
      },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not post delivery challan.');
      },
    });
  }

  close(): void { this.showForm.set(false); }
}
