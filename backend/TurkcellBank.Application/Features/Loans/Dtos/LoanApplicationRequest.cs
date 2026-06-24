using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Loans.Dtos;

/// <summary>
/// Kredi başvuru isteği (genişletilmiş form). Enum'lar JSON'da metin olarak
/// gelir ("Single"/"Married", "Tenant"/"Owner").
/// </summary>
public record LoanApplicationRequest(
    string NationalId,
    int Age,
    MaritalStatus MaritalStatus,
    int ChildrenCount,
    HousingStatus HousingStatus,
    decimal Income,
    decimal MonthlyExpenses,
    int EmploymentMonths,
    string Profession,
    decimal Amount,
    int TermMonths,
    Guid DisbursementAccountId); // kredinin yatırılacağı / taksitlerin çekileceği hesap
