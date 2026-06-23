using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Loans.Dtos;

/// <summary>
/// Yetkili (şube/il müdürü/direktör) onay kuyruğundaki bir kredi başvurusu.
/// Yöneticinin hızlı karar verebilmesi için başvuranın profili + AI raporu +
/// motorun tavsiyesi birlikte taşınır. <c>CanApprove</c>, isteği yapan yöneticinin
/// bu krediyi onaylama yetkisi olup olmadığını belirtir (banttaysa true; değilse
/// sadece görüntüler).
/// </summary>
public record PendingLoanDto(
    Guid Id,
    string ApplicantName,
    string ApplicantEmail,
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
    int Score,
    decimal MaxLimit,
    decimal ExistingDebt,
    decimal NetLimit,
    string AiReason,
    string RecommendedStatus,
    string RequiredApproverRole,
    DateTime CreatedAt,
    bool CanApprove);

/// <summary>Yetkilinin onay/red kararı için (opsiyonel not).</summary>
public record ApprovalDecisionRequest(string? Note);
