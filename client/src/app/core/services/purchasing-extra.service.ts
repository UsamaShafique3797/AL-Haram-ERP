import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PurchaseOrderDto, SavePurchaseOrderRequest, PurchaseOrderStatus,
  GrnDto, SaveGrnRequest, StockTransferDto, SaveStockTransferRequest,
} from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  private readonly api = `${environment.apiUrl}/purchase-orders`;
  private http = inject(HttpClient);

  getAll(supplierId?: string): Observable<PurchaseOrderDto[]> {
    let params = new HttpParams();
    if (supplierId) params = params.set('supplierId', supplierId);
    return this.http.get<PurchaseOrderDto[]>(this.api, { params });
  }

  getById(id: string): Observable<PurchaseOrderDto> {
    return this.http.get<PurchaseOrderDto>(`${this.api}/${id}`);
  }

  create(req: SavePurchaseOrderRequest): Observable<PurchaseOrderDto> {
    return this.http.post<PurchaseOrderDto>(this.api, req);
  }

  update(id: string, req: SavePurchaseOrderRequest): Observable<PurchaseOrderDto> {
    return this.http.put<PurchaseOrderDto>(`${this.api}/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  updateStatus(id: string, status: PurchaseOrderStatus): Observable<PurchaseOrderDto> {
    return this.http.post<PurchaseOrderDto>(`${this.api}/${id}/status`, status);
  }
}

@Injectable({ providedIn: 'root' })
export class GrnService {
  private readonly api = `${environment.apiUrl}/grns`;
  private http = inject(HttpClient);

  getAll(supplierId?: string): Observable<GrnDto[]> {
    let params = new HttpParams();
    if (supplierId) params = params.set('supplierId', supplierId);
    return this.http.get<GrnDto[]>(this.api, { params });
  }

  getById(id: string): Observable<GrnDto> {
    return this.http.get<GrnDto>(`${this.api}/${id}`);
  }

  create(req: SaveGrnRequest): Observable<GrnDto> {
    return this.http.post<GrnDto>(this.api, req);
  }
}

@Injectable({ providedIn: 'root' })
export class StockTransferService {
  private readonly api = `${environment.apiUrl}/stock-transfers`;
  private http = inject(HttpClient);

  getAll(): Observable<StockTransferDto[]> {
    return this.http.get<StockTransferDto[]>(this.api);
  }

  getById(id: string): Observable<StockTransferDto> {
    return this.http.get<StockTransferDto>(`${this.api}/${id}`);
  }

  create(req: SaveStockTransferRequest): Observable<StockTransferDto> {
    return this.http.post<StockTransferDto>(this.api, req);
  }

  update(id: string, req: SaveStockTransferRequest): Observable<StockTransferDto> {
    return this.http.put<StockTransferDto>(`${this.api}/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  complete(id: string): Observable<StockTransferDto> {
    return this.http.post<StockTransferDto>(`${this.api}/${id}/complete`, {});
  }
}
