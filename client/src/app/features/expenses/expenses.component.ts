import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ExpenseService } from '../../core/services/expense.service';
import { ExpenseCategoryService } from '../../core/services/expense-category.service';
import { PaymentAccountService } from '../../core/services/payment-account.service';
import { FileService } from '../../core/services/file.service';
import { AccessService } from '../../core/services/access.service';
import { AuthService } from '../../core/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { GodownService } from '../../core/services/godown.service';
import { ExpenseCategoryDto, ExpenseDto, GodownDto, PaymentAccountDto } from '../../core/models/domain.models';

import { GridSearchBarComponent } from '../../shared/grid-search-bar.component';
import { filterByGridSearch, gridEmptyMessage } from '../../shared/grid-search.util';
@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe, RouterLink, GridSearchBarComponent],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Expenses</h1>
        <p class="page-sub">Record business expenses paid from cash or bank.</p>
      </div>
      <div class="spacer"></div>
      @if (access.canView('expenses/categories')) {
        <a class="btn btn-ghost" routerLink="/expenses/categories">Categories</a>
      }
      @if (access.canWrite('expenses')) {
        <button class="btn btn-primary" (click)="openNew()" [disabled]="!ready()">+ New expense</button>
      }
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <app-grid-search-bar [value]="searchTerm()" (valueChange)="searchTerm.set($event)" placeholder="Search expenses…" />
      <table class="table">
        <thead>
          <tr><th>Number</th><th>Date</th><th>Category</th><th>Account</th><th class="num">Amount</th><th>Notes</th><th></th></tr>
        </thead>
        <tbody>
          @for (e of filteredRows(); track e.id) {
            <tr>
              <td>{{ e.number }}</td>
              <td>{{ e.date | date:'mediumDate' }}</td>
              <td>{{ e.expenseCategoryName }}</td>
              <td>{{ e.paymentAccountName }}</td>
              <td class="num">{{ money(e.amount) }}</td>
              <td>{{ e.notes || '—' }}</td>
              <td style="text-align:right; white-space:nowrap">
                @if (access.canWrite('expenses')) {
                  <button class="btn btn-ghost btn-sm" (click)="edit(e)">Edit</button>
                }
                @if (access.canDelete('expenses')) {
                  <button class="btn btn-danger btn-sm" (click)="remove(e)">Delete</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" style="text-align:center;color:var(--muted)">{{ emptyGridMessage('No expenses recorded yet.') }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>{{ editingId ? 'Edit expense' : 'New expense' }}</h3>
            @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:1"><label>Date</label><input type="date" formControlName="date" /></div>
                <div class="field" style="flex:2">
                  <label>Category</label>
                  <select formControlName="expenseCategoryId">
                    <option value="">— select —</option>
                    @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
                  </select>
                </div>
                <div class="field" style="flex:1"><label>Amount</label><input type="number" step="0.01" formControlName="amount" /></div>
              </div>
              <div class="row">
                <div class="field" style="flex:2">
                  <label>Paid from</label>
                  <select formControlName="paymentAccountId">
                    <option value="">— select —</option>
                    @for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.name }} ({{ money(a.currentBalance) }})</option> }
                  </select>
                </div>
                <div class="field" style="flex:2">
                  <label>Receipt attachment</label>
                  <input type="file" accept="image/*,.pdf" (change)="onFile($event)" />
                  @if (uploading()) { <span class="muted">Uploading…</span> }
                  @if (form.value.attachmentPath) { <span class="muted">{{ form.value.attachmentPath }}</span> }
                </div>
              </div>
              @if (showBranch()) {
                <div class="field">
                  <label>Branch</label>
                  <select formControlName="godownId">
                    @for (g of godowns(); track g.id) { <option [value]="g.id">{{ g.name }}</option> }
                  </select>
                </div>
              }
              <div class="field"><label>Notes</label><input formControlName="notes" /></div>
              <div class="row" style="justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
                <button class="btn btn-primary" [disabled]="form.invalid || loading()">
                  {{ loading() ? 'Saving…' : (editingId ? 'Save changes' : 'Save expense') }}
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
      display: grid; place-items: center; padding: 1rem; z-index: 50; }
    .modal { width: 100%; max-width: 560px; }
    .num { text-align: right; }
  `],
})
export class ExpensesComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private expenseService = inject(ExpenseService);
  private categoryService = inject(ExpenseCategoryService);
  private accountService = inject(PaymentAccountService);
  private fileService = inject(FileService);
  private auth = inject(AuthService);
  private branchContext = inject(BranchContextService);
  private godownService = inject(GodownService);

  expenses = signal<ExpenseDto[]>([]);
  searchTerm = signal('');
  filteredRows = computed(() => filterByGridSearch(this.expenses(), this.searchTerm()));
  categories = signal<ExpenseCategoryDto[]>([]);
  accounts = signal<PaymentAccountDto[]>([]);
  godowns = signal<GodownDto[]>([]);
  showBranch = computed(() => !!this.auth.user()?.canAccessAllBranches);
  ready = signal(false);
  showForm = signal(false);
  loading = signal(false);
  uploading = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);
  editingId: string | null = null;

  form = this.fb.nonNullable.group({
    date: [new Date().toISOString().substring(0, 10), Validators.required],
    expenseCategoryId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    paymentAccountId: ['', Validators.required],
    godownId: [''],
    notes: [''],
    attachmentPath: [''],
  });


  emptyGridMessage = (defaultMessage: string) => gridEmptyMessage(this.searchTerm(), defaultMessage);
  ngOnInit(): void {
    forkJoin({
      expenses: this.expenseService.getAll(),
      categories: this.categoryService.getAll(),
      accounts: this.accountService.getAll(),
      godowns: this.godownService.getAllUnscoped(),
    }).subscribe({
      next: (d) => {
        this.expenses.set(d.expenses);
        this.categories.set(d.categories.filter((c) => c.isActive));
        this.accounts.set(d.accounts.filter((a) => a.isActive));
        this.godowns.set(d.godowns.filter((g) => g.isActive));
        this.ready.set(true);
      },
      error: () => this.error.set('Could not load expenses.'),
    });
  }

  money(v: number): string {
    return 'Rs ' + Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  openNew(): void {
    this.editingId = null;
    this.formError.set(null);
    this.form.reset({
      date: new Date().toISOString().substring(0, 10),
      expenseCategoryId: '',
      amount: 0,
      paymentAccountId: this.accounts().find((a) => a.isDefault)?.id ?? '',
      godownId: this.defaultBranchId(),
      notes: '',
      attachmentPath: '',
    });
    this.showForm.set(true);
  }

  edit(e: ExpenseDto): void {
    this.editingId = e.id;
    this.formError.set(null);
    this.form.reset({
      date: e.date.substring(0, 10),
      expenseCategoryId: e.expenseCategoryId,
      amount: e.amount,
      paymentAccountId: e.paymentAccountId,
      godownId: e.godownId ?? this.defaultBranchId(),
      notes: e.notes ?? '',
      attachmentPath: e.attachmentPath ?? '',
    });
    this.showForm.set(true);
  }

  private defaultBranchId(): string {
    return this.branchContext.selectedGodownId() ?? this.godowns().find((g) => g.isDefault)?.id ?? this.godowns()[0]?.id ?? '';
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.formError.set(null);
    const payload = this.form.getRawValue();
    const req = this.editingId
      ? this.expenseService.update(this.editingId, payload)
      : this.expenseService.create(payload);
    req.subscribe({
      next: () => {
        this.loading.set(false);
        this.close();
        this.expenseService.getAll().subscribe({ next: (list) => this.expenses.set(list) });
        this.accountService.getAll().subscribe({ next: (list) => this.accounts.set(list.filter((a) => a.isActive)) });
      },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not save expense.');
      },
    });
  }

  remove(e: ExpenseDto): void {
    if (!confirm(`Delete expense ${e.number}?`)) return;
    this.expenseService.delete(e.id).subscribe({
      next: () => this.expenseService.getAll().subscribe({ next: (list) => this.expenses.set(list) }),
      error: () => this.error.set('Could not delete expense.'),
    });
  }

  close(): void { this.showForm.set(false); this.editingId = null; }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.fileService.upload(file).subscribe({
      next: (res) => {
        this.form.patchValue({ attachmentPath: res.path });
        this.uploading.set(false);
      },
      error: () => { this.uploading.set(false); this.formError.set('File upload failed.'); },
    });
  }
}
