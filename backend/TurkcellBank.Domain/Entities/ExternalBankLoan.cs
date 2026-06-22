namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Diğer bankalardaki mevcut kredi kaydı (FAKE veri). TC kimlik no ile sorgulanır.
/// Başvuranın bizim bankadan alabileceği net limit hesaplanırken, bu bankalardaki
/// kalan borç toplamı düşülür. Gerçek bir kredi bürosu (KKB) yerine geçen demo verisi.
/// </summary>
public class ExternalBankLoan
{
    public Guid Id { get; set; }

    public string NationalId { get; set; } = string.Empty; // TC kimlik no (11 hane)
    public string BankName { get; set; } = string.Empty;

    public decimal OriginalAmount { get; set; }     // ilk çekilen tutar
    public decimal RemainingDebt { get; set; }       // kalan borç (limitten bu düşülür)
    public decimal MonthlyInstallment { get; set; }  // aylık taksit
}
