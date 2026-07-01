using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Kredi kartı limit artış talebi. Talep edilen değer yeni toplam limittir;
/// motorun hesapladığı öneri saklanır, yüksek limit bandında yetkili karar verir.
/// </summary>
public class CreditCardLimitIncreaseRequest
{
    public Guid Id { get; set; }

    public Guid CreditCardId { get; set; }
    public CreditCard? CreditCard { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public decimal CurrentLimit { get; set; }
    public decimal RequestedLimit { get; set; }
    public decimal RecommendedLimit { get; set; }

    public int Age { get; set; }
    public MaritalStatus MaritalStatus { get; set; }
    public int ChildrenCount { get; set; }
    public HousingStatus HousingStatus { get; set; }
    public decimal Income { get; set; }
    public decimal MonthlyExpenses { get; set; }
    public int EmploymentMonths { get; set; }
    public string Profession { get; set; } = string.Empty;

    public CreditCardLimitRequestStatus Status { get; set; } = CreditCardLimitRequestStatus.Pending;
    public int Score { get; set; }
    public string AiReason { get; set; } = string.Empty;
    public Guid? DecidedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DecidedAt { get; set; }

    public Channel Channel { get; set; } = Channel.Internet;
    public Guid? PerformedByEmployeeId { get; set; }
}
