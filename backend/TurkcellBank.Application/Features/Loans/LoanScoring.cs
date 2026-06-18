namespace TurkcellBank.Application.Features.Loans;

/// <summary>
/// Risk skorlama (0-100). Üç bileşen:
///  - Gelir düzeyi (0-40) — gerçekçi TR maaş aralıkları
///  - Ödeme gücü / borç-gelir oranı (DTI) (0-40) — aylık taksitin gelire oranı
///  - Vade (0-20) — kısa vade daha az risk
/// Skor admin'e tavsiye amaçlı gösterilir; kararı admin verir.
/// </summary>
public static class LoanScoring
{
    public static int Calculate(decimal income, decimal amount, int termMonths)
    {
        if (income <= 0 || amount <= 0 || termMonths <= 0)
            return 0;

        var score = 0;

        // 1) Gelir düzeyi (0-40) — yaklaşık 2026 TR aylık net maaş aralıkları
        if (income >= 150000) score += 40;
        else if (income >= 90000) score += 33;
        else if (income >= 60000) score += 26;
        else if (income >= 40000) score += 18;
        else if (income >= 25000) score += 10; // ~asgari ücret civarı
        else score += 3;

        // 2) Ödeme gücü: aylık taksitin gelire oranı (DTI)
        //    Taksit, ödeme planıyla aynı yöntemle (basit faiz) hesaplanır.
        var monthlyPayment =
            amount * (1 + PaymentPlanCalculator.MonthlyRate * termMonths) / termMonths;
        var dti = monthlyPayment / income;

        if (dti <= 0.20m) score += 40;       // çok rahat
        else if (dti <= 0.35m) score += 28;  // makul
        else if (dti <= 0.50m) score += 15;  // sınırda
        else score += 0;                     // ödeme gücü zayıf

        // 3) Vade (0-20)
        if (termMonths <= 12) score += 20;
        else if (termMonths <= 24) score += 14;
        else if (termMonths <= 36) score += 8;
        else score += 3;

        return Math.Clamp(score, 0, 100);
    }
}
