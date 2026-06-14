import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CompanyDto, UpdateCompanyRequest } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly api = `${environment.apiUrl}/company`;

  constructor(private http: HttpClient) {}

  get(): Observable<CompanyDto> {
    return this.http.get<CompanyDto>(this.api);
  }

  update(request: UpdateCompanyRequest): Observable<CompanyDto> {
    return this.http.put<CompanyDto>(this.api, request);
  }
}
