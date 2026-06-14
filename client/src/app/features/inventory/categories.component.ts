import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../../core/services/category.service';
import { CategoryDto } from '../../core/models/domain.models';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Categories</h1>
        <p class="page-sub">Group your items (Steel Bars, Rings, Cement…).</p>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-primary" (click)="openNew()">+ New category</button>
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead><tr><th>Name</th><th>Code</th><th>Items</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (c of categories(); track c.id) {
            <tr>
              <td>{{ c.name }}</td>
              <td>{{ c.code || '—' }}</td>
              <td>{{ c.itemCount }}</td>
              <td>
                @if (c.isActive) { <span class="badge badge-success">Active</span> }
                @else { <span class="badge badge-muted">Inactive</span> }
              </td>
              <td style="text-align:right">
                <button class="btn btn-ghost btn-sm" (click)="edit(c)">Edit</button>
                <button class="btn btn-danger btn-sm" (click)="remove(c)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" style="text-align:center;color:var(--muted)">No categories yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>{{ editingId ? 'Edit category' : 'New category' }}</h3>
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:2"><label>Name</label><input formControlName="name" /></div>
                <div class="field" style="flex:1"><label>Code</label><input formControlName="code" /></div>
              </div>
              <div class="field"><label>Description</label><input formControlName="description" /></div>
              <label class="check"><input type="checkbox" formControlName="isActive" /> Active</label>
              <div class="row" style="justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
                <button class="btn btn-primary" [disabled]="form.invalid || loading()">
                  {{ loading() ? 'Saving…' : 'Save' }}
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
    .modal { width: 100%; max-width: 480px; }
    .check { display: flex; align-items: center; gap: .4rem; font-size: .85rem; color: var(--ink-soft); }
  `],
})
export class CategoriesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(CategoryService);

  categories = signal<CategoryDto[]>([]);
  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  editingId: string | null = null;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    code: [''],
    description: [''],
    isActive: [true],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.service.getAll().subscribe({
      next: (list) => this.categories.set(list),
      error: () => this.error.set('Could not load categories.'),
    });
  }

  openNew(): void {
    this.editingId = null;
    this.form.reset({ name: '', code: '', description: '', isActive: true });
    this.showForm.set(true);
  }

  edit(c: CategoryDto): void {
    this.editingId = c.id;
    this.form.reset({ name: c.name, code: c.code ?? '', description: c.description ?? '', isActive: c.isActive });
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const value = this.form.getRawValue();
    const req = this.editingId ? this.service.update(this.editingId, value) : this.service.create(value);
    req.subscribe({
      next: () => { this.loading.set(false); this.close(); this.load(); },
      error: () => { this.loading.set(false); this.error.set('Could not save category.'); },
    });
  }

  remove(c: CategoryDto): void {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    this.service.delete(c.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Could not delete category. It may still have items.'),
    });
  }

  close(): void { this.showForm.set(false); }
}
