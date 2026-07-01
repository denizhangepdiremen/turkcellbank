using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Bir dönemin kredi kartı ekstresi. Kesim gününde worker tarafından oluşturulur:
/// o dönem faturalanan kalemlerin toplamı (<see cref="TotalDue"/>), asgari ödeme
/// (<see cref="MinimumPayment"/>) ve son ödeme tarihi (<see cref="DueDate"/>)
/// hesaplanır. Ödeme yapıldıkça <see cref="PaidAmount"/>/<see cref="RemainingAmount"/>
/// güncellenir; tamamı ödenince <c>Status = Paid</c>.
/// </summary>
public class CreditCardStatement
{
    public Guid Id { get; set; }

    public Guid CreditCardId { get; set; }
    public CreditCard? CreditCard { get; set; }

    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public DateTime StatementDate { get; set; } // kesim tarihi
    public DateTime DueDate { get; set; }        // son ödeme tarihi (kesim + DueDayOffset)

    public decimal TotalDue { get; set; }        // bu dönem faturalanan toplam
    public decimal MinimumPayment { get; set; }  // asgari ödeme (dönem borcunun %20'si)
    public decimal PaidAmount { get; set; }      // bu ekstreye yapılan toplam ödeme
    public decimal RemainingAmount { get; set; } // TotalDue - PaidAmount

    public CreditCardStatementStatus Status { get; set; } = CreditCardStatementStatus.Due;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
