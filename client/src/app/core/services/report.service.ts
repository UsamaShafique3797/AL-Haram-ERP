import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DashboardSummaryDto, ExpenseReportDto, ProfitLossDto, PurchaseReportDto,
  SalesReportDto, StockValuationReportDto,
} from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly api = `${environment.apiUrl}/reports`;
  private http = inject(HttpClient);

  getProfitLoss(from: string, to: string): Observable<ProfitLossDto> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<ProfitLossDto>(`${this.api}/profit-loss`, { params });
  }

  getSalesReport(from: string, to: string): Observable<SalesReportDto> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<SalesReportDto>(`${this.api}/sales`, { params });
  }

  getPurchaseReport(from: string, to: string): Observable<PurchaseReportDto> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<PurchaseReportDto>(`${this.api}/purchases`, { params });
  }

  getStockValuation(): Observable<StockValuationReportDto> {
    return this.http.get<StockValuationReportDto>(`${this.api}/stock-valuation`);
  }

  getExpenseReport(from: string, to: string): Observable<ExpenseReportDto> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<ExpenseReportDto>(`${this.api}/expenses`, { params });
  }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = `${environment.apiUrl}/dashboard`;
  private http = inject(HttpClient);

  getSummary(): Observable<DashboardSummaryDto> {
    return this.http.get<DashboardSummaryDto>(`${this.api}/summary`);
  }
}

@Injectable({ providedIn: 'root' })
export class AgeingService {
  private readonly api = `${environment.apiUrl}/ageing`;
  private http = inject(HttpClient);

  getReceivables() {
    return this.http.get<import('../models/domain.models').ReceivableAgeingDto[]>(`${this.api}/receivables`);
  }

  getPayables() {
    return this.http.get<import('../models/domain.models').PayableAgeingDto[]>(`${this.api}/payables`);
  }
}

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly api = `${environment.apiUrl}/audit-logs`;
  private http = inject(HttpClient);

  getRecent(limit = 100) {
    return this.http.get<import('../models/domain.models').AuditLogDto[]>(`${this.api}`, {
      params: new HttpParams().set('limit', limit),
    });
  }
}
