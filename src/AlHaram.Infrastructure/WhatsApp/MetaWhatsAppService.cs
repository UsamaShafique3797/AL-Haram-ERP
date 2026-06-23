using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using AlHaram.Application.WhatsApp;
using Microsoft.Extensions.Options;

namespace AlHaram.Infrastructure.WhatsApp;

public class MetaWhatsAppService : IWhatsAppService
{
    private readonly HttpClient _http;
    private readonly WhatsAppSettings _settings;

    public MetaWhatsAppService(HttpClient http, IOptions<WhatsAppSettings> settings)
    {
        _http = http;
        _settings = settings.Value;
    }

    public bool IsConfigured => _settings.IsConfigured;

    public async Task SendTextAsync(string phoneE164Digits, string message, CancellationToken ct = default)
    {
        EnsureConfigured();

        var payload = new
        {
            messaging_product = "whatsapp",
            to = phoneE164Digits,
            type = "text",
            text = new { body = message },
        };

        await PostMessageAsync(payload, ct);
    }

    public async Task SendDocumentAsync(
        string phoneE164Digits,
        byte[] fileBytes,
        string fileName,
        string? caption = null,
        CancellationToken ct = default)
    {
        EnsureConfigured();

        var mediaId = await UploadMediaAsync(fileBytes, fileName, ct);

        var payload = new
        {
            messaging_product = "whatsapp",
            to = phoneE164Digits,
            type = "document",
            document = new
            {
                id = mediaId,
                filename = fileName,
                caption = caption ?? string.Empty,
            },
        };

        await PostMessageAsync(payload, ct);
    }

    private void EnsureConfigured()
    {
        if (!IsConfigured)
            throw new InvalidOperationException(
                "WhatsApp is not configured. Add WhatsApp:Enabled, AccessToken, and PhoneNumberId in appsettings.");
    }

    private string BaseUrl => $"https://graph.facebook.com/{_settings.ApiVersion}/{_settings.PhoneNumberId}";

    private async Task<string> UploadMediaAsync(byte[] fileBytes, string fileName, CancellationToken ct)
    {
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("whatsapp"), "messaging_product");
        form.Add(new StringContent("application/pdf"), "type");

        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        form.Add(fileContent, "file", fileName);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/media")
        {
            Content = form,
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.AccessToken);

        using var response = await _http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"WhatsApp media upload failed: {body}");

        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.GetProperty("id").GetString()
               ?? throw new InvalidOperationException("WhatsApp media upload returned no id.");
    }

    private async Task PostMessageAsync(object payload, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/messages")
        {
            Content = JsonContent.Create(payload),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.AccessToken);

        using var response = await _http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"WhatsApp send failed: {body}");
    }
}
