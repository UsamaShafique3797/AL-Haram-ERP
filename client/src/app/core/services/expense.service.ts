import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExpenseDto, SaveExpenseRequest } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly api = `${environment.apiUrl}/expenses`;
  private http = inject(HttpClient);

  getAll(from?: string, to?: string, categoryId?: string): Observable<ExpenseDto[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    if (categoryId) params = params.set('categoryId', categoryId);
    return this.http.get<ExpenseDto[]>(this.api, { params });
  }

  create(request: SaveExpenseRequest): Observable<ExpenseDto> {
    return this.http.post<ExpenseDto>(this.api, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
