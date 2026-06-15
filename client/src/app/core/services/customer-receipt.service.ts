import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CustomerReceiptDto, SaveCustomerReceiptRequest } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class CustomerReceiptService {
  private readonly api = `${environment.apiUrl}/customer-receipts`;
  private http = inject(HttpClient);

  getAll(customerId?: string): Observable<CustomerReceiptDto[]> {
    let params = new HttpParams();
    if (customerId) params = params.set('customerId', customerId);
    return this.http.get<CustomerReceiptDto[]>(this.api, { params });
  }

  create(request: SaveCustomerReceiptRequest): Observable<CustomerReceiptDto> {
    return this.http.post<CustomerReceiptDto>(this.api, request);
  }
}
