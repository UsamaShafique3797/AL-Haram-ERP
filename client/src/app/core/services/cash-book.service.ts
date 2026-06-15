import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CashBookDto } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class CashBookService {
  private readonly api = `${environment.apiUrl}/cash-book`;
  private http = inject(HttpClient);

  getAll(from?: string, to?: string): Observable<CashBookDto[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<CashBookDto[]>(this.api, { params });
  }

  getByAccount(accountId: string, from?: string, to?: string): Observable<CashBookDto> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<CashBookDto>(`${this.api}/${accountId}`, { params });
  }
}
