namespace TurkcellBank.Application.Features.Loans;

/// <summary>
/// Basit risk skorlama (0-100). Banka "Risk Değerlendirme Servisi"nin
/// örnek/sade hali. Admin'e tavsiye amaçlı gösterilir; kararı admin verir.
/// </summary>
public static class LoanScoring
{
    public static int Calculate(decimal income, decimal amount, int termMonths)
    {
        var score = 50;

        // Gelir ne kadar yüksekse o kadar iyi
        if (income >= 20000) score += 30;
        else if (income >= 10000) score += 20;
        else if (income >= 5000) score += 5;
        else score -= 10;

        // İstenen tutarın gelire oranı (taşınabilirlik)
        var ratio = amount / Math.Max(income, 1);
        if (ratio <= 6) score += 20;
        else if (ratio <= 12) score += 5;
        else score -= 15;

        // Kısa vade biraz daha az riskli
        if (termMonths <= 12) score += 5;

        // 0-100 aralığına sıkıştır
        return Math.Clamp(score, 0, 100);
    }
}
