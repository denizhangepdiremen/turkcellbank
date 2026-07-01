using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Kredi kartı hareketi / ekstre kalemi. Harcama planı taksitlere bölerken her
/// dönem kesiminde bir <see cref="CreditCardTxType.Installment"/>/<c>Purchase</c>
/// kalemi doğar ve o dönemin ekstresine (<see cref="StatementId"/>) bağlanır.
/// Ödeme/iade kalemleri de burada izlenir (ekstreye bağlı olmayabilir).
/// </summary>
public class CreditCardTransaction
{
    public Guid Id { get; set; }

    public Guid CreditCardId { get; set; }
    public CreditCard? CreditCard { get; set; }

    public CreditCardTxType Type { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;

    // Taksitli alışverişten doğduysa hangi plan ve kaçıncı taksit (ör. 2/6)
    public Guid? InstallmentPlanId { get; set; }
    public int? InstallmentNo { get; set; }

    // Hangi ekstrede faturalandı; null = henüz kesilmedi (ör. ödeme kalemi)
    public Guid? StatementId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
