import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OpenInvoiceDto, SalesInvoiceDto } from '../models/domain.models';
import {
  buildInvoiceWhatsAppMessage,
  buildWhatsAppChatUrl,
  downloadBlob,
  formatMoney,
  readBlobError,
  sharePdfViaWebShare,
  toWhatsAppDigits,
} from '../utils/whatsapp-share.util';

export interface WhatsAppStatusDto {
  configured: boolean;
  message: string;
}

export interface WhatsAppShareResult {
  error: string | null;
  /** When manual attach is needed, open this URL to reach the customer on WhatsApp. */
  chatUrl?: string;
  info?: string;
}

@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  private readonly api = `${environment.apiUrl}`;
  private http = inject(HttpClient);
  private serverConfigured: boolean | null = null;

  getStatus(): Observable<WhatsAppStatusDto> {
    return this.http.get<WhatsAppStatusDto>(`${this.api}/whatsapp/status`);
  }

  async shareInvoicePdf(
    invoice: SalesInvoiceDto,
    customerPhone: string | null | undefined,
    companyName: string,
  ): Promise<WhatsAppShareResult> {
    const phone = toWhatsAppDigits(customerPhone);
    if (!phone) {
      return { error: 'Customer has no valid phone number. Add one under Customers.' };
    }

    if (await this.isServerConfigured()) {
      try {
        await firstValueFrom(
          this.http.post(`${this.api}/customer-messaging/invoices/${invoice.id}/whatsapp`, {}),
        );
        return {
          error: null,
          info: 'Invoice PDF sent to the customer on WhatsApp.',
        };
      } catch (err) {
        const msg = this.httpErrorMessage(err, 'Could not send invoice on WhatsApp.');
        return { error: msg };
      }
    }

    const fileName = `${invoice.number}.pdf`;
    let blob: Blob;
    try {
      blob = await this.fetchInvoicePdf(invoice.id);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not generate invoice PDF.' };
    }

    const manualMessage = buildInvoiceWhatsAppMessage(companyName, invoice, 'manual');
    const file = new File([blob], fileName, { type: 'application/pdf' });

    const shared = await sharePdfViaWebShare(file, manualMessage);
    if (shared === 'shared') {
      return { error: null, info: 'Invoice shared — choose WhatsApp and send.' };
    }
    if (shared === 'cancelled') {
      return { error: null };
    }

    downloadBlob(blob, fileName);

    return {
      error: null,
      chatUrl: buildWhatsAppChatUrl(phone, manualMessage),
      info: `${fileName} downloaded. Open WhatsApp below, tap 📎, attach the PDF from Downloads, then send.`,
    };
  }

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

    window.open(buildWhatsAppChatUrl(phone, message), '_blank', 'noopener,noreferrer');
    return null;
  }

  async shareStatementPdf(
    customerId: string,
    customerPhone: string | null | undefined,
    customerName: string,
    outstanding: number,
    companyName: string,
  ): Promise<WhatsAppShareResult> {
    const phone = toWhatsAppDigits(customerPhone);
    if (!phone) return { error: 'Customer has no valid phone number. Add one under Customers.' };
    if (outstanding <= 0) return { error: 'This customer has no outstanding balance.' };

    if (await this.isServerConfigured()) {
      try {
        await firstValueFrom(
          this.http.post(`${this.api}/customer-messaging/customers/${customerId}/payment-reminder`, {
            mode: 1, // PaymentReminderMode.Statement
          }),
        );
        return { error: null, info: 'Statement PDF sent on WhatsApp.' };
      } catch (err) {
        return { error: this.httpErrorMessage(err, 'Could not send statement on WhatsApp.') };
      }
    }

    const fileName = `Statement-${customerName}.pdf`;
    let blob: Blob;
    try {
      blob = await firstValueFrom(
        this.http.get(`${this.api}/customer-messaging/customers/${customerId}/statement.pdf`, {
          responseType: 'blob',
        }),
      );
      if (!blob.type.includes('pdf') && blob.size < 5000) {
        return { error: await readBlobError(blob, 'Could not generate statement PDF.') };
      }
    } catch (err) {
      return { error: this.httpErrorMessage(err, 'Could not generate statement PDF.') };
    }

    const message =
      `${companyName}\n\n` +
      `Dear ${customerName},\n\n` +
      `Your outstanding balance is Rs ${formatMoney(outstanding)}.\n` +
      `Your statement PDF has been saved on this device.\n` +
      `Please attach it using the 📎 icon in WhatsApp before you send.\n\nThank you.`;

    const file = new File([blob], fileName, { type: 'application/pdf' });
    const shared = await sharePdfViaWebShare(file, message);
    if (shared === 'shared' || shared === 'cancelled') {
      return { error: null, info: shared === 'shared' ? 'Statement shared — choose WhatsApp and send.' : undefined };
    }

    downloadBlob(blob, fileName);
    return {
      error: null,
      chatUrl: buildWhatsAppChatUrl(phone, message),
      info: `${fileName} downloaded. Open WhatsApp below, attach the PDF, then send.`,
    };
  }

  private async isServerConfigured(): Promise<boolean> {
    if (this.serverConfigured !== null) return this.serverConfigured;
    try {
      const status = await firstValueFrom(this.getStatus());
      this.serverConfigured = status.configured;
      return status.configured;
    } catch {
      this.serverConfigured = false;
      return false;
    }
  }

  private async fetchInvoicePdf(invoiceId: string): Promise<Blob> {
    try {
      const blob = await firstValueFrom(
        this.http.get(`${this.api}/customer-messaging/invoices/${invoiceId}/pdf`, { responseType: 'blob' }),
      );
      if (blob.type.includes('json') || (blob.type.includes('text') && blob.size < 5000)) {
        throw new Error(await readBlobError(blob, 'Could not generate invoice PDF.'));
      }
      if (blob.size < 100) {
        throw new Error('Invoice PDF is empty.');
      }
      return blob;
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        throw new Error(this.httpErrorMessage(err, 'Could not generate invoice PDF.'));
      }
      throw err instanceof Error ? err : new Error('Could not generate invoice PDF.');
    }
  }

  private httpErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const errors = err.error?.errors;
      if (Array.isArray(errors) && errors[0]) return errors[0];
      if (typeof err.error === 'string' && err.error) return err.error;
    }
    return fallback;
  }
}
