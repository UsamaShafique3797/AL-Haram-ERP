import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProductionOrderDto, SaveProductionOrderRequest } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class ProductionOrderService {
  private readonly api = `${environment.apiUrl}/production-orders`;
  private http = inject(HttpClient);

  getAll(): Observable<ProductionOrderDto[]> {
    return this.http.get<ProductionOrderDto[]>(this.api);
  }

  getById(id: string): Observable<ProductionOrderDto> {
    return this.http.get<ProductionOrderDto>(`${this.api}/${id}`);
  }

  create(request: SaveProductionOrderRequest): Observable<ProductionOrderDto> {
    return this.http.post<ProductionOrderDto>(this.api, request);
  }

  complete(id: string): Observable<ProductionOrderDto> {
    return this.http.post<ProductionOrderDto>(`${this.api}/${id}/complete`, {});
  }

  cancel(id: string): Observable<ProductionOrderDto> {
    return this.http.post<ProductionOrderDto>(`${this.api}/${id}/cancel`, {});
  }
}
