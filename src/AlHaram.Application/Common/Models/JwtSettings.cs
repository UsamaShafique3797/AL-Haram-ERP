namespace AlHaram.Application.Common.Models;

public class JwtSettings
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "AlHaram";
    public string Audience { get; set; } = "AlHaramClient";
    public string Secret { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 480;
}
