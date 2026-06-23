import { Injectable, signal } from '@angular/core';

const BRANCH_KEY = 'alharam.branch';
const BRANCH_NAME_KEY = 'alharam.branchName';

/** Admin branch filter; branch users are locked via login profile. */
@Injectable({ providedIn: 'root' })
export class BranchContextService {
  private readonly _selectedGodownId = signal<string | null>(this.readStored(BRANCH_KEY));
  private readonly _selectedGodownName = signal<string | null>(this.readStored(BRANCH_NAME_KEY));

  readonly selectedGodownId = this._selectedGodownId.asReadonly();
  readonly selectedGodownName = this._selectedGodownName.asReadonly();

  setSelectedGodown(id: string | null, name: string | null = null): void {
    this._selectedGodownId.set(id);
    this._selectedGodownName.set(name);
    if (id) {
      localStorage.setItem(BRANCH_KEY, id);
      if (name) localStorage.setItem(BRANCH_NAME_KEY, name);
      else localStorage.removeItem(BRANCH_NAME_KEY);
    } else {
      localStorage.removeItem(BRANCH_KEY);
      localStorage.removeItem(BRANCH_NAME_KEY);
    }
  }

  apiGodownId(canAccessAllBranches: boolean, userGodownId?: string | null): string | null {
    if (!canAccessAllBranches) return userGodownId ?? null;
    return this._selectedGodownId();
  }

  private readStored(key: string): string | null {
    return localStorage.getItem(key);
  }
}
