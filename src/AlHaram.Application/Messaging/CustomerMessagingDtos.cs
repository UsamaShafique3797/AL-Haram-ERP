using AlHaram.Application.Common.Models;

namespace AlHaram.Application.Messaging;

public enum PaymentReminderMode
{
    Text = 0,
    Statement = 1,
}

public record WhatsAppStatusDto(bool Configured, string Message);

public record WhatsAppSendResultDto(string RecipientPhone, string Detail);

public record PdfFileDto(byte[] Content, string FileName);

public interface ICustomerMessagingService
{
    Task<Result<WhatsAppSendResultDto>> SendInvoicePdfAsync(Guid invoiceId, CancellationToken ct = default);

    Task<Result<WhatsAppSendResultDto>> SendPaymentReminderAsync(
        Guid customerId,
        PaymentReminderMode mode,
        CancellationToken ct = default);

    Task<Result<PdfFileDto>> GetInvoicePdfAsync(Guid invoiceId, CancellationToken ct = default);

    Task<Result<PdfFileDto>> GetStatementPdfAsync(Guid customerId, CancellationToken ct = default);
}
