import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CustomerLedgerDto, ReceivableDto } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class CustomerLedgerService {
  private readonly api = `${environment.apiUrl}/customer-ledger`;
  private http = inject(HttpClient);

  getLedger(customerId: string): Observable<CustomerLedgerDto> {
    return this.http.get<CustomerLedgerDto>(`${this.api}/${customerId}`);
  }

  getReceivables(): Observable<ReceivableDto[]> {
    return this.http.get<ReceivableDto[]>(`${this.api}/receivables`);
  }
}
