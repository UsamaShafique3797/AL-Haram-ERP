import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaymentAccountDto } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class PaymentAccountService {
  private readonly api = `${environment.apiUrl}/payment-accounts`;
  private http = inject(HttpClient);

  getAll(): Observable<PaymentAccountDto[]> {
    return this.http.get<PaymentAccountDto[]>(this.api);
  }
}
