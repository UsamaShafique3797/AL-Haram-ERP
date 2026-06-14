import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  OpeningStockRequest,
  SaveStockAdjustmentRequest,
  StockAdjustmentDto,
  StockLevelDto,
  StockMovementDto,
} from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class StockService {
  private readonly api = `${environment.apiUrl}/stock`;
  private http = inject(HttpClient);

  getLevels(): Observable<StockLevelDto[]> {
    return this.http.get<StockLevelDto[]>(`${this.api}/levels`);
  }

  getMovements(itemId: string, godownId?: string): Observable<StockMovementDto[]> {
    let params = new HttpParams();
    if (godownId) params = params.set('godownId', godownId);
    return this.http.get<StockMovementDto[]>(`${this.api}/movements/${itemId}`, { params });
  }

  postOpeningStock(request: OpeningStockRequest): Observable<StockMovementDto> {
    return this.http.post<StockMovementDto>(`${this.api}/opening`, request);
  }

  getAdjustments(): Observable<StockAdjustmentDto[]> {
    return this.http.get<StockAdjustmentDto[]>(`${this.api}/adjustments`);
  }

  createAdjustment(request: SaveStockAdjustmentRequest): Observable<StockAdjustmentDto> {
    return this.http.post<StockAdjustmentDto>(`${this.api}/adjustments`, request);
  }
}
