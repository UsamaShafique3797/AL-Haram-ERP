using System.Text.RegularExpressions;

namespace AlHaram.Infrastructure.WhatsApp;

internal static class PhoneNumberHelper
{
    /// <summary>Normalize to digits only with country code (default Pakistan 92).</summary>
    public static string? ToWhatsAppDigits(string? phone, string defaultCountryCode = "92")
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;

        var digits = Regex.Replace(phone, @"\D", "");
        if (digits.Length == 0) return null;

        if (digits.StartsWith('0') && digits.Length >= 10)
            digits = defaultCountryCode + digits[1..];

        if (digits.Length == 10 && digits.StartsWith('3'))
            digits = defaultCountryCode + digits;

        return digits.Length >= 10 ? digits : null;
    }
}
