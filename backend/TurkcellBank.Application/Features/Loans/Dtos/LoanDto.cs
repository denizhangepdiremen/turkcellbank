namespace TurkcellBank.Application.Features.Loans.Dtos;

/// <summary>
/// Müşteriye dönülen kredi bilgisi. PaymentPlan sadece detayda + onaylıysa dolu;
/// listede null.
/// </summary>
public record LoanDto(
    Guid Id,
    decimal Income,
    string Profession,
    decimal Amount,
    int TermMonths,
    string Status,
    int Score,
    DateTime CreatedAt,
    DateTime? DecidedAt,
    PaymentPlanDto? PaymentPlan);

/// <summary>Admin listesi için: başvuran bilgisiyle birlikte.</summary>
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
    DateTime CreatedAt,
    DateTime? DecidedAt);
