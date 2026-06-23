import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OpenInvoiceDto, SalesInvoiceDto } from '../models/domain.models';
import {
  downloadBlob,
  formatMoney,
  openWhatsAppChat,
  toWhatsAppDigits,
} from '../utils/whatsapp-share.util';

export interface WhatsAppStatusDto {
  configured: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  private readonly api = `${environment.apiUrl}`;
  private http = inject(HttpClient);

  /** True when paid Meta API is configured; otherwise free wa.me flow is used. */
  getStatus(): Observable<WhatsAppStatusDto> {
    return this.http.get<WhatsAppStatusDto>(`${this.api}/whatsapp/status`);
  }

  /** Free: download invoice PDF and open WhatsApp chat to attach it. */
  async shareInvoicePdf(
    invoice: SalesInvoiceDto,
    customerPhone: string | null | undefined,
    companyName: string,
  ): Promise<string | null> {
    const phone = toWhatsAppDigits(customerPhone);
    if (!phone) return 'Customer has no valid phone number. Add one under Customers.';

    const blob = await firstValueFrom(
      this.http.get(`${this.api}/customer-messaging/invoices/${invoice.id}/pdf`, { responseType: 'blob' }),
    );
    downloadBlob(blob, `${invoice.number}.pdf`);

    const message =
      `${companyName}\n` +
      `Invoice ${invoice.number}\n` +
      `Date: ${new Date(invoice.date).toLocaleDateString()}\n` +
      `Total: Rs ${formatMoney(invoice.total)}\n` +
      `Balance: Rs ${formatMoney(invoice.balance)}\n\n` +
      `Please find your invoice PDF attached.`;

    openWhatsAppChat(phone, message);
    return null;
  }

  /** Free: open WhatsApp with a payment reminder text. */
  sharePaymentReminderText(
    customerPhone: string | null | undefined,
    customerName: string,
    outstanding: number,
    openInvoices: OpenInvoiceDto[],
    companyName: string,
  ): string | null {
    const phone = toWhatsAppDigits(customerPhone);
    if (!phone) return 'Customer has no valid phone number. Add one under Customers.';
    if (outstanding <= 0) return 'This customer has no outstanding balance.';

    const lines = openInvoices.map(
      (i) => `• ${i.number} (${new Date(i.date).toLocaleDateString()}) — Rs ${formatMoney(i.balance)}`,
    );
    const message =
      `${companyName}\n\n` +
      `Dear ${customerName},\n\n` +
      `This is a friendly reminder that you have an outstanding balance of Rs ${formatMoney(outstanding)}.\n\n` +
      (lines.length ? `Open invoices:\n${lines.join('\n')}\n\n` : '') +
      `Please arrange payment at your earliest convenience.\nThank you.`;

    openWhatsAppChat(phone, message);
    return null;
  }

  /** Free: download statement PDF and open WhatsApp chat. */
  async shareStatementPdf(
    customerId: string,
    customerPhone: string | null | undefined,
    customerName: string,
    outstanding: number,
    companyName: string,
  ): Promise<string | null> {
    const phone = toWhatsAppDigits(customerPhone);
    if (!phone) return 'Customer has no valid phone number. Add one under Customers.';
    if (outstanding <= 0) return 'This customer has no outstanding balance.';

    const blob = await firstValueFrom(
      this.http.get(`${this.api}/customer-messaging/customers/${customerId}/statement.pdf`, { responseType: 'blob' }),
    );
    downloadBlob(blob, `Statement-${customerName}.pdf`);

    const message =
      `${companyName}\n\n` +
      `Dear ${customerName},\n\n` +
      `Your outstanding balance is Rs ${formatMoney(outstanding)}.\n` +
      `Please see the attached statement PDF.\n\nThank you.`;

    openWhatsAppChat(phone, message);
    return null;
  }
}
