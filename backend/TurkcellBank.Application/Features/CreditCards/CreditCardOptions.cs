namespace TurkcellBank.Application.Features.CreditCards;

/// <summary>
/// Kredi kartı limit/onay/asgari parametreleri (config "CreditCard" bölümünden okunur).
/// Limit motorun tavsiyesi <see cref="IncomeMultiple"/> × aylık gelir ile sınırlanır ve
/// [<see cref="MinLimit"/>, <see cref="MaxLimit"/>] bandına kırpılır. Atanan limit
/// <see cref="AutoApproveMaxLimit"/>'i aşarsa başvuru yetkili onayına düşer.
/// </summary>
public class CreditCardOptions
{
    public decimal MinLimit { get; set; } = 5_000m;
    public decimal MaxLimit { get; set; } = 200_000m;
    public decimal IncomeMultiple { get; set; } = 3m;
    public decimal AutoApproveMaxLimit { get; set; } = 100_000m; // üstü → yetkili onayı
    public decimal MinimumPaymentRatio { get; set; } = 0.20m;    // asgari ödeme oranı
    public int MaxInstallments { get; set; } = 12;               // POS taksit üst sınırı
    public decimal MonthlyContractInterestRate { get; set; } = 0.035m; // asgari ödenirse kalan borca akdi faiz
    public decimal MonthlyOverdueInterestRate { get; set; } = 0.045m;  // asgari ödenmezse gecikme faizi
    public decimal CashAdvanceFeeRate { get; set; } = 0.03m;           // nakit avans komisyon oranı
    public decimal CashAdvanceMinFee { get; set; } = 50m;              // asgari nakit avans komisyonu
}
