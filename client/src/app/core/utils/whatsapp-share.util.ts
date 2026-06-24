/** Normalize phone to digits for wa.me (default Pakistan 92). */
export function toWhatsAppDigits(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0') && digits.length >= 10) digits = '92' + digits.slice(1);
  if (digits.length === 10 && digits.startsWith('3')) digits = '92' + digits;
  return digits.length >= 10 ? digits : null;
}

export function buildWhatsAppChatUrl(phoneDigits: string, message: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppChat(phoneDigits: string, message: string): void {
  window.open(buildWhatsAppChatUrl(phoneDigits, message), '_blank', 'noopener,noreferrer');
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatMoney(v: number): string {
  return Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function buildInvoiceWhatsAppMessage(
  companyName: string,
  invoice: { number: string; date: string; total: number; balance: number },
  attachNote: 'attached' | 'manual' = 'manual',
): string {
  const lines = [
    companyName,
    `Invoice ${invoice.number}`,
    `Date: ${new Date(invoice.date).toLocaleDateString()}`,
    `Total: Rs ${formatMoney(invoice.total)}`,
    `Balance: Rs ${formatMoney(invoice.balance)}`,
    '',
  ];
  if (attachNote === 'attached') {
    lines.push('Please find your invoice PDF attached.');
  } else {
    lines.push('Your invoice PDF has been saved on this device.');
    lines.push('Please attach it using the 📎 icon in WhatsApp before you send.');
  }
  return lines.join('\n');
}

/** True when the browser can share a PDF file (common on mobile). */
export function canSharePdfFile(file: File): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [file], text: 'Invoice' });
  } catch {
    return false;
  }
}

export async function sharePdfViaWebShare(file: File, text: string): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (!canSharePdfFile(file)) return 'unsupported';
  try {
    await navigator.share({ files: [file], text, title: file.name });
    return 'shared';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

export async function readBlobError(blob: Blob, fallback: string): Promise<string> {
  try {
    const text = await blob.text();
    const json = JSON.parse(text) as { errors?: string[] };
    return json.errors?.[0] ?? fallback;
  } catch {
    return fallback;
  }
}
