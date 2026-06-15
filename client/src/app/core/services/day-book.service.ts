import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DayBookDto } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class DayBookService {
  private readonly api = `${environment.apiUrl}/day-book`;
  private http = inject(HttpClient);

  getForDate(date: string): Observable<DayBookDto> {
    const params = new HttpParams().set('date', date);
    return this.http.get<DayBookDto>(this.api, { params });
  }
}
