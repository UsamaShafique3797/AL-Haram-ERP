namespace AlHaram.Application.WhatsApp;

public class WhatsAppSettings
{
    public const string SectionName = "WhatsApp";

    /// <summary>When false, send endpoints return a clear configuration error.</summary>
    public bool Enabled { get; set; }

    /// <summary>Meta Graph API access token (WhatsApp Business Cloud API).</summary>
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>WhatsApp phone-number ID from Meta Business Manager.</summary>
    public string PhoneNumberId { get; set; } = string.Empty;

    /// <summary>Graph API version, e.g. v21.0</summary>
    public string ApiVersion { get; set; } = "v21.0";

    public bool IsConfigured =>
        Enabled
        && !string.IsNullOrWhiteSpace(AccessToken)
        && !string.IsNullOrWhiteSpace(PhoneNumberId);
}
