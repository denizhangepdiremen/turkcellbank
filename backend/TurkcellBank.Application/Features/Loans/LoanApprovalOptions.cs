namespace TurkcellBank.Application.Features.Loans;

/// <summary>
/// Tutar bazlı kredi onay eşikleri (config "Loan" bölümünden okunur).
/// Bant: tutar ≤ AutoDecisionLimit → otomatik; ≤ BranchManagerLimit → şube müdürü;
/// ≤ ProvincialManagerLimit → il müdürü; üstü → direktör.
/// </summary>
public class LoanApprovalOptions
{
    public decimal AutoDecisionLimit { get; set; } = 10_000_000m;     // 10M TL
    public decimal BranchManagerLimit { get; set; } = 50_000_000m;    // 50M TL
    public decimal ProvincialManagerLimit { get; set; } = 100_000_000m; // 100M TL
}
