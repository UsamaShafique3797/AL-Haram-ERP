namespace AlHaram.Application.WhatsApp;

public interface IWhatsAppService
{
    bool IsConfigured { get; }

    Task SendTextAsync(string phoneE164Digits, string message, CancellationToken ct = default);

    Task SendDocumentAsync(
        string phoneE164Digits,
        byte[] fileBytes,
        string fileName,
        string? caption = null,
        CancellationToken ct = default);
}
