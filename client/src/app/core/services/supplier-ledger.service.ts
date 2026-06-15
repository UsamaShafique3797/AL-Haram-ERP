import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PayableDto, SupplierLedgerDto } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class SupplierLedgerService {
  private readonly api = `${environment.apiUrl}/supplier-ledger`;
  private http = inject(HttpClient);

  getLedger(supplierId: string): Observable<SupplierLedgerDto> {
    return this.http.get<SupplierLedgerDto>(`${this.api}/${supplierId}`);
  }

  getPayables(): Observable<PayableDto[]> {
    return this.http.get<PayableDto[]>(`${this.api}/payables`);
  }
}
