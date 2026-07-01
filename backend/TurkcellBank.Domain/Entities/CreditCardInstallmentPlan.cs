namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Bir kredi kartı alışverişinin taksit planı. Peşin alışveriş de tek taksitli
/// bir plandır (<see cref="InstallmentCount"/> = 1). Alışveriş anında tüm tutar
/// karttaki <c>CurrentDebt</c>'i artırır (limit bloke); ekstre worker'ı her
/// dönem yalnız bir taksiti (<see cref="InstallmentAmount"/>) faturalandırır.
/// </summary>
public class CreditCardInstallmentPlan
{
    public Guid Id { get; set; }

    public Guid CreditCardId { get; set; }
    public CreditCard? CreditCard { get; set; }

    public decimal TotalAmount { get; set; }
    public int InstallmentCount { get; set; }          // >= 1
    public int InstallmentsBilled { get; set; }        // 0..InstallmentCount
    public decimal InstallmentAmount { get; set; }     // TotalAmount / count (son taksit yuvarlama farkını yutar)

    public string Description { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Aktif = InstallmentsBilled < InstallmentCount (henüz faturalanacak taksit var)
}
