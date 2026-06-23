namespace TurkcellBank.Application.Features.Transactions;

/// <summary>
/// Havale güvenlik eşikleri (config "Transfer" bölümünden okunur).
///  - InternetLimit: bu tutarın üstü internet bankacılığında YAPILAMAZ (şubeye yönlendirilir).
///  - BranchManagerApprovalLimit: bu tutarın üstü şubede şube müdürü onayı gerektirir.
/// </summary>
public class TransferOptions
{
    public decimal InternetLimit { get; set; } = 250_000m;            // 250.000 TL
    public decimal BranchManagerApprovalLimit { get; set; } = 1_000_000m; // 1.000.000 TL
}
