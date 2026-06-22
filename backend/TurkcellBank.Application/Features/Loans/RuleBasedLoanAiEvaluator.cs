using TurkcellBank.Application.Features.Loans.Dtos;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Loans;

/// <summary>
/// Deterministik (kural tabanlı) kredi değerlendirme motoru. Dış servis/API
/// gerektirmez; Gemini API key yapılandırılmadığında otomatik devreye girer
/// ve testlerin offline/tekrarlanabilir kalmasını sağlar.
///
/// Yöntem: benzer gelir profilindeki, temerrüde düşmemiş referans müşterilerin
/// "verilen kredi / gelir" oranının ortalamasını alır, başvuranın profil
/// faktörleriyle (konut, medeni hal, çocuk, kıdem, yaş, ödeme gücü) ölçekler.
/// </summary>
public class RuleBasedLoanAiEvaluator : ILoanAiEvaluator
{
    public Task<LoanAiResult> EvaluateAsync(
        LoanEvaluationContext c, CancellationToken cancellationToken = default)
    {
        var disposable = c.Income - c.MonthlyExpenses;
        if (c.Income <= 0 || disposable <= 0)
        {
            return Task.FromResult(new LoanAiResult(
                0,
                "Aylık geliriniz giderlerinizi karşılamadığı için kredi limiti hesaplanamadı."));
        }

        // Benzer gelir bandındaki (±%40), temerrüde düşmemiş kayıtlar
        var similar = c.Peers
            .Where(p => !p.Defaulted && p.MonthlyIncome > 0
                        && p.MonthlyIncome >= c.Income * 0.6m
                        && p.MonthlyIncome <= c.Income * 1.4m)
            .ToList();

        // "Verilen kredi / gelir" katsayısı (yeterli benzer yoksa varsayılan)
        var incomeMultiple = similar.Count >= 5
            ? similar.Average(p => p.GrantedAmount / p.MonthlyIncome)
            : 10m;

        var baseLimit = c.Income * incomeMultiple;

        // Profil faktörleri
        var factor = 1m;
        factor *= c.HousingStatus == HousingStatus.Owner ? 1.15m : 0.90m;
        if (c.MaritalStatus == MaritalStatus.Married) factor *= 1.05m;
        factor *= 1m - Math.Min(c.ChildrenCount, 5) * 0.03m;
        if (c.EmploymentMonths < 12) factor *= 0.80m;
        else if (c.EmploymentMonths >= 60) factor *= 1.10m;
        if (c.Age < 25 || c.Age > 65) factor *= 0.85m;

        // Ödeme gücü: harcanabilir gelir oranı (0.5x .. 1.5x ölçek)
        var disposableRatio = disposable / c.Income;
        factor *= 0.5m + disposableRatio;

        // En yakın 100 TL'ye yuvarla
        var maxLimit = Math.Max(0, Math.Round(baseLimit * factor / 100m) * 100m);

        var reason =
            $"Benzer gelir profilindeki {similar.Count} müşteri verisi ve profiliniz " +
            $"(yaş {c.Age}, {(c.MaritalStatus == MaritalStatus.Married ? "evli" : "bekar")}, " +
            $"{c.ChildrenCount} çocuk, {(c.HousingStatus == HousingStatus.Owner ? "ev sahibi" : "kiracı")}, " +
            $"{c.EmploymentMonths} ay kıdem, aylık net {(c.Income - c.MonthlyExpenses):N0} TL) " +
            $"değerlendirildiğinde tahmini maksimum kredi limitiniz {maxLimit:N0} TL.";

        return Task.FromResult(new LoanAiResult(maxLimit, reason));
    }
}
