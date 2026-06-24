namespace TurkcellBank.Application.Features.Loans.Dtos;

/// <summary>
/// Müşteriye dönülen kredi bilgisi. Başvuru anında AI/kural motoru otomatik
/// karar verir; <c>AiReason</c> onay/red gerekçesini taşır. PaymentPlan sadece
/// detayda + onaylıysa dolu; listede null.
/// </summary>
public record LoanDto(
    Guid Id,
    decimal Income,
    string Profession,
    decimal Amount,
    int TermMonths,
    string Status,
    int Score,
    decimal MaxLimit,
    decimal ExistingDebt,
    decimal NetLimit,
    string AiReason,
    string DecidedBy,
    string DecisionNote, // yetkili karar notu (otomatik kredilerde boş)
    decimal MonthlyInstallment, // aylık taksit (onaylıysa > 0)
    decimal RemainingDebt,      // kalan toplam borç (faiz dahil)
    int InstallmentsPaid,       // ödenen taksit sayısı
    DateTime CreatedAt,
    DateTime? DecidedAt,
    PaymentPlanDto? PaymentPlan);

/// <summary>Admin listesi için: başvuran bilgisi + AI kararıyla birlikte (salt-okunur).</summary>
public record AdminLoanDto(
    Guid Id,
    string ApplicantName,
    string ApplicantEmail,
    decimal Income,
    string Profession,
    decimal Amount,
    int TermMonths,
    string Status,
    int Score,
    decimal MaxLimit,
    decimal NetLimit,
    string AiReason,
    string DecidedBy,
    DateTime CreatedAt,
    DateTime? DecidedAt);
