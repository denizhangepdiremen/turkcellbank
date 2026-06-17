using TurkcellBank.Application.Features.Loans.Dtos;

namespace TurkcellBank.Application.Features.Loans;

/// <summary>
/// Basit eşit taksitli ödeme planı (sabit aylık %2.5 faiz).
///   toplam = tutar * (1 + aylıkFaiz * vade)
///   aylık taksit = toplam / vade
/// </summary>
public static class PaymentPlanCalculator
{
    public const decimal MonthlyRate = 0.025m;

    public static PaymentPlanDto Calculate(decimal amount, int termMonths, DateTime startDate)
    {
        var total = amount * (1 + MonthlyRate * termMonths);
        var monthly = Math.Round(total / termMonths, 2);
        // Yuvarlama tutarlılığı: toplamı aylıktan yeniden türet
        var consistentTotal = monthly * termMonths;

        var installments = new List<InstallmentDto>();
        for (var i = 1; i <= termMonths; i++)
        {
            installments.Add(new InstallmentDto(i, startDate.AddMonths(i), monthly));
        }

        return new PaymentPlanDto(MonthlyRate, monthly, consistentTotal, installments);
    }
}
