namespace TurkcellBank.API.RateLimiting;

/// <summary>
/// Hız sınırlama eşikleri (config "RateLimit" bölümünden okunur). Sabit pencere
/// (fixed window), IP başına. Production'da sıkı; Development'ta gevşek
/// (appsettings.Development.json) tutulur ki E2E suite tetiklemesin.
/// </summary>
public class RateLimitOptions
{
    public RateLimitRule Auth { get; set; } = new() { PermitLimit = 5, WindowSeconds = 60 };
    public RateLimitRule Register { get; set; } = new() { PermitLimit = 3, WindowSeconds = 60 };
    public RateLimitRule Global { get; set; } = new() { PermitLimit = 100, WindowSeconds = 60 };
}

public class RateLimitRule
{
    public int PermitLimit { get; set; }
    public int WindowSeconds { get; set; }
}
