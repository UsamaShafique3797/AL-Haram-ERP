import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OpenPurchaseInvoiceDto, PurchaseInvoiceDto, SavePurchaseInvoiceRequest } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class PurchaseInvoiceService {
  private readonly api = `${environment.apiUrl}/purchase-invoices`;
  private http = inject(HttpClient);

  getAll(supplierId?: string): Observable<PurchaseInvoiceDto[]> {
    let params = new HttpParams();
    if (supplierId) params = params.set('supplierId', supplierId);
    return this.http.get<PurchaseInvoiceDto[]>(this.api, { params });
  }

  getById(id: string): Observable<PurchaseInvoiceDto> {
    return this.http.get<PurchaseInvoiceDto>(`${this.api}/${id}`);
  }

  getOpenForSupplier(supplierId: string): Observable<OpenPurchaseInvoiceDto[]> {
    return this.http.get<OpenPurchaseInvoiceDto[]>(`${this.api}/open/${supplierId}`);
  }

  create(request: SavePurchaseInvoiceRequest): Observable<PurchaseInvoiceDto> {
    return this.http.post<PurchaseInvoiceDto>(this.api, request);
  }
}
