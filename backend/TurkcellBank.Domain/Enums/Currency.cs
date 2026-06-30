namespace TurkcellBank.Domain.Enums;

/// <summary>
/// Hesap / işlem para birimi. TRY temel birim; USD/EUR döviz, XAU gram altın.
/// Veritabanında string saklanır.
/// </summary>
public enum Currency
{
    TRY,
    USD,
    EUR,
    XAU, // gram altın
}
