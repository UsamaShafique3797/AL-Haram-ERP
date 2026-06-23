import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { GodownService } from '../../core/services/godown.service';
import { ItemService } from '../../core/services/item.service';
import { StockTransferService } from '../../core/services/purchasing-extra.service';
import { AccessService } from '../../core/services/access.service';
import {
  GodownDto, ItemDto, StockTransferDto, StockTransferStatus, StockTransferStatusLabels,
} from '../../core/models/domain.models';

@Component({
  selector: 'app-stock-transfers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
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
      <table class="table">
        <thead>
          <tr><th>Number</th><th>Date</th><th>From</th><th>To</th><th>Status</th><th>Lines</th><th></th></tr>
        </thead>
        <tbody>
          @for (t of transfers(); track t.id) {
            <tr>
              <td>{{ t.number }}</td>
              <td>{{ t.date | date:'mediumDate' }}</td>
              <td>{{ t.fromGodownName }}</td>
              <td>{{ t.toGodownName }}</td>
              <td>{{ statusLabel(t.status) }}</td>
              <td>{{ t.lines.length }}</td>
              <td style="text-align:right">
                @if (t.status === draftStatus && access.canWrite('stock/transfers')) {
                  <button class="btn btn-primary btn-sm" (click)="complete(t)" [disabled]="actionId() === t.id">
                    {{ actionId() === t.id ? 'Completing…' : 'Complete' }}
                  </button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" style="text-align:center;color:var(--muted)">No stock transfers yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>New stock transfer</h3>
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
                  {{ loading() ? 'Saving…' : 'Create transfer' }}
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

  transfers = signal<StockTransferDto[]>([]);
  godowns = signal<GodownDto[]>([]);
  items = signal<ItemDto[]>([]);
  ready = signal(false);
  showForm = signal(false);
  loading = signal(false);
  actionId = signal<string | null>(null);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);

  readonly draftStatus = StockTransferStatus.Draft;

  form = this.fb.nonNullable.group({
    fromGodownId: ['', Validators.required],
    toGodownId: ['', Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
    notes: [''],
    lines: this.fb.array<FormGroup>([]),
  });

  get lines(): FormArray { return this.form.get('lines') as FormArray; }

  ngOnInit(): void {
    this.load();
    forkJoin({
      godowns: this.godownService.getAll(),
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
    this.formError.set(null);
    const defaultGodown = this.godowns().find((g) => g.isDefault) ?? this.godowns()[0];
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

  save(): void {
    if (this.form.invalid || this.lines.length === 0) return;
    const v = this.form.getRawValue();
    if (v.fromGodownId === v.toGodownId) {
      this.formError.set('From and to godown must be different.');
      return;
    }
    this.loading.set(true);
    this.formError.set(null);

    this.transferService.create({
      date: v.date,
      fromGodownId: v.fromGodownId,
      toGodownId: v.toGodownId,
      notes: v.notes || null,
      lines: v.lines.map((l: any) => ({
        itemId: l.itemId,
        quantity: Number(l.quantity),
      })),
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.close();
        this.load();
      },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not create stock transfer.');
      },
    });
  }

  close(): void { this.showForm.set(false); }
}
