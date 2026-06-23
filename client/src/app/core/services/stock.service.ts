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
  UpdateStockLevelRequest,
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

  updateStockLevel(request: UpdateStockLevelRequest): Observable<StockLevelDto> {
    return this.http.put<StockLevelDto>(`${this.api}/levels`, request);
  }

  deleteStockLevel(itemId: string, godownId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/levels/${itemId}/${godownId}`);
  }

  getAdjustments(): Observable<StockAdjustmentDto[]> {
    return this.http.get<StockAdjustmentDto[]>(`${this.api}/adjustments`);
  }

  createAdjustment(request: SaveStockAdjustmentRequest): Observable<StockAdjustmentDto> {
    return this.http.post<StockAdjustmentDto>(`${this.api}/adjustments`, request);
  }
}
