/** Normalize phone to digits for wa.me (default Pakistan 92). */
export function toWhatsAppDigits(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0') && digits.length >= 10) digits = '92' + digits.slice(1);
  if (digits.length === 10 && digits.startsWith('3')) digits = '92' + digits;
  return digits.length >= 10 ? digits : null;
}

export function openWhatsAppChat(phoneDigits: string, message: string): void {
  const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatMoney(v: number): string {
  return Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
