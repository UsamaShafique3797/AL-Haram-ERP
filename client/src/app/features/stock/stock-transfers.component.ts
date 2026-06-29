import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { GodownService } from '../../core/services/godown.service';
import { ItemService } from '../../core/services/item.service';
import { StockTransferService } from '../../core/services/purchasing-extra.service';
import { AccessService } from '../../core/services/access.service';
import { AuthService } from '../../core/services/auth.service';
import {
  GodownDto, ItemDto, StockTransferDto, StockTransferStatus, StockTransferStatusLabels,
} from '../../core/models/domain.models';

import { GridSearchBarComponent } from '../../shared/grid-search-bar.component';
import { filterByGridSearch, gridEmptyMessage } from '../../shared/grid-search.util';
@Component({
  selector: 'app-stock-transfers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe, GridSearchBarComponent],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Stock transfers</h1>
        <p class="page-sub">Move inventory between godowns.</p>
      </div>
      <div class="spacer"></div>
      @if (access.canWrite('stock/transfers')) {
        <button class="btn btn-primary" (click)="openNew()" [disabled]="!ready()">+ New transfer</button>
      }
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <app-grid-search-bar [value]="searchTerm()" (valueChange)="searchTerm.set($event)" placeholder="Search transfers…" />
      <table class="table">
        <thead>
          <tr><th>Number</th><th>Date</th><th>From</th><th>To</th><th>Status</th><th>Lines</th><th></th></tr>
        </thead>
        <tbody>
          @for (t of filteredRows(); track t.id) {
            <tr>
              <td>{{ t.number }}</td>
              <td>{{ t.date | date:'mediumDate' }}</td>
              <td>{{ t.fromGodownName }}</td>
              <td>{{ t.toGodownName }}</td>
              <td>{{ statusLabel(t.status) }}</td>
              <td>{{ t.lines.length }}</td>
              <td style="text-align:right; white-space:nowrap">
                @if (t.status === draftStatus) {
                  @if (access.canWrite('stock/transfers')) {
                    <button class="btn btn-ghost btn-sm" (click)="edit(t)">Edit</button>
                    <button class="btn btn-primary btn-sm" (click)="complete(t)" [disabled]="actionId() === t.id">
                      {{ actionId() === t.id ? 'Completing…' : 'Complete' }}
                    </button>
                  }
                  @if (access.canDelete('stock/transfers')) {
                    <button class="btn btn-danger btn-sm" (click)="remove(t)">Delete</button>
                  }
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" style="text-align:center;color:var(--muted)">{{ emptyGridMessage('No stock transfers yet.') }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>{{ editingId ? 'Edit stock transfer' : 'New stock transfer' }}</h3>
            @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }

            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:1">
                  <label>From godown</label>
                  <select formControlName="fromGodownId">
                    <option value="">— select —</option>
                    @for (g of godowns(); track g.id) { <option [value]="g.id">{{ g.name }}</option> }
                  </select>
                </div>
                <div class="field" style="flex:1">
                  <label>To godown</label>
                  <select formControlName="toGodownId">
                    <option value="">— select —</option>
                    @for (g of godowns(); track g.id) { <option [value]="g.id">{{ g.name }}</option> }
                  </select>
                </div>
                <div class="field" style="flex:1"><label>Date</label><input type="date" formControlName="date" /></div>
              </div>

              <h4 style="margin:.25rem 0">Lines</h4>
              <div formArrayName="lines">
                @for (row of lines.controls; track $index; let idx = $index) {
                  <div class="row" [formGroupName]="idx" style="align-items:flex-end">
                    <div class="field" style="flex:2">
                      <label>Item</label>
                      <select formControlName="itemId">
                        <option value="">— select —</option>
                        @for (it of items(); track it.id) { <option [value]="it.id">{{ it.name }} ({{ it.code }})</option> }
                      </select>
                    </div>
                    <div class="field" style="flex:1"><label>Qty (base)</label><input type="number" step="0.0001" formControlName="quantity" /></div>
                    <button type="button" class="btn btn-danger btn-sm" style="margin-bottom:1rem" (click)="removeLine(idx)">×</button>
                  </div>
                }
              </div>
              <button type="button" class="btn btn-ghost btn-sm" (click)="addLine()">+ Add line</button>

              <div class="field" style="margin-top:.75rem"><label>Notes</label><input formControlName="notes" /></div>

              <div class="row" style="justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
                <button class="btn btn-primary" [disabled]="form.invalid || lines.length === 0 || loading()">
                  {{ loading() ? 'Saving…' : (editingId ? 'Save changes' : 'Create transfer') }}
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
    .modal { width: 100%; max-width: 720px; margin: auto; }
    h4 { font-size: .9rem; }
  `],
})
export class StockTransfersComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private transferService = inject(StockTransferService);
  private godownService = inject(GodownService);
  private itemService = inject(ItemService);
  private auth = inject(AuthService);

  transfers = signal<StockTransferDto[]>([]);
  searchTerm = signal('');
  filteredRows = computed(() => filterByGridSearch(this.transfers(), this.searchTerm()));
  godowns = signal<GodownDto[]>([]);
  items = signal<ItemDto[]>([]);
  ready = signal(false);
  showForm = signal(false);
  loading = signal(false);
  actionId = signal<string | null>(null);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);
  editingId: string | null = null;

  readonly draftStatus = StockTransferStatus.Draft;

  form = this.fb.nonNullable.group({
    fromGodownId: ['', Validators.required],
    toGodownId: ['', Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
    notes: [''],
    lines: this.fb.array<FormGroup>([]),
  });

  get lines(): FormArray { return this.form.get('lines') as FormArray; }


  emptyGridMessage = (defaultMessage: string) => gridEmptyMessage(this.searchTerm(), defaultMessage);
  ngOnInit(): void {
    this.load();
    forkJoin({
      godowns: this.godownService.getAllUnscoped(),
      items: this.itemService.getAll(),
    }).subscribe(({ godowns, items }) => {
      this.godowns.set(godowns);
      this.items.set(items.filter((i) => i.isActive && i.trackInventory));
      this.ready.set(true);
    });
  }

  load(): void {
    this.transferService.getAll().subscribe({
      next: (list) => this.transfers.set(list),
      error: () => this.error.set('Could not load stock transfers.'),
    });
  }

  statusLabel(status: number): string {
    return StockTransferStatusLabels[status] ?? String(status);
  }

  complete(t: StockTransferDto): void {
    this.actionId.set(t.id);
    this.transferService.complete(t.id).subscribe({
      next: () => { this.actionId.set(null); this.load(); },
      error: () => { this.actionId.set(null); this.error.set('Could not complete transfer.'); },
    });
  }

  private lineGroup(): FormGroup {
    return this.fb.nonNullable.group({
      itemId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.0001)]],
    });
  }

  addLine(): void { this.lines.push(this.lineGroup()); }
  removeLine(i: number): void { this.lines.removeAt(i); }

  openNew(): void {
    this.editingId = null;
    this.formError.set(null);
    // Branch users transfer out of their own godown by default.
    const user = this.auth.user();
    const ownGodown = !user?.canAccessAllBranches && user?.godownId
      ? this.godowns().find((g) => g.id === user.godownId)
      : undefined;
    const defaultGodown = ownGodown ?? this.godowns().find((g) => g.isDefault) ?? this.godowns()[0];
    const toGodown = this.godowns().find((g) => g.id !== defaultGodown?.id) ?? this.godowns()[1];
    this.lines.clear();
    this.form.reset({
      fromGodownId: defaultGodown?.id ?? '',
      toGodownId: toGodown?.id ?? '',
      date: new Date().toISOString().substring(0, 10),
      notes: '',
    });
    this.addLine();
    this.showForm.set(true);
  }

  edit(t: StockTransferDto): void {
    this.editingId = t.id;
    this.formError.set(null);
    this.lines.clear();
    this.form.reset({
      fromGodownId: t.fromGodownId,
      toGodownId: t.toGodownId,
      date: t.date.substring(0, 10),
      notes: t.notes ?? '',
    });
    for (const l of t.lines) {
      this.lines.push(this.fb.nonNullable.group({
        itemId: [l.itemId, Validators.required],
        quantity: [l.quantity, [Validators.required, Validators.min(0.0001)]],
      }));
    }
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid || this.lines.length === 0) return;
    const v = this.form.getRawValue();
    if (v.fromGodownId === v.toGodownId) {
      this.formError.set('From and to godown must be different.');
      return;
    }
    this.loading.set(true);
    this.formError.set(null);
    const payload = {
      date: v.date,
      fromGodownId: v.fromGodownId,
      toGodownId: v.toGodownId,
      notes: v.notes || null,
      lines: v.lines.map((l: any) => ({
        itemId: l.itemId,
        quantity: Number(l.quantity),
      })),
    };
    const req = this.editingId
      ? this.transferService.update(this.editingId, payload)
      : this.transferService.create(payload);
    req.subscribe({
      next: () => {
        this.loading.set(false);
        this.close();
        this.load();
      },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not save stock transfer.');
      },
    });
  }

  remove(t: StockTransferDto): void {
    if (!confirm(`Delete transfer ${t.number}?`)) return;
    this.transferService.delete(t.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Could not delete transfer.'),
    });
  }

  close(): void { this.showForm.set(false); this.editingId = null; }
}
