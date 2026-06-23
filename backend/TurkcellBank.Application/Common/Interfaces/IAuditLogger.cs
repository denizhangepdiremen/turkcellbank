namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>
/// Kesişen (cross-cutting) denetim kaydı yazıcısı. Servisler önemli aksiyonlarda
/// çağırır; aktör (kim) ve rol mevcut kullanıcıdan otomatik alınır.
/// </summary>
public interface IAuditLogger
{
    Task LogAsync(string action, string detail);
}
