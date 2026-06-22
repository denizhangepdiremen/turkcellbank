using TurkcellBank.Application.Features.Loans.Dtos;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Features.Loans;

/// <summary>
/// Aday referans havuzundan başvurana EN BENZER kayıtları seçer.
/// Benzerlik sadece gelire değil; gelir + gider + yaş + konut + medeni hal +
/// çocuk sayısına göre ağırlıklı bir "uzaklık" puanıyla ölçülür (düşük = benzer).
/// Böylece değerlendirmeye gerçekten benzer profiller girer.
/// </summary>
public static class PeerMatcher
{
    public static List<ReferenceCreditRecord> SelectMostSimilar(
        LoanApplicationRequest applicant,
        IEnumerable<ReferenceCreditRecord> candidates,
        int count)
    {
        return candidates
            .OrderBy(c => Distance(applicant, c))
            .Take(count)
            .ToList();
    }

    /// <summary>Ağırlıklı benzerlik uzaklığı (0'a yakın = çok benzer).</summary>
    private static double Distance(LoanApplicationRequest a, ReferenceCreditRecord c)
    {
        // Gelir ölçeğine göre normalize (mutlak TL farkı yerine oransal fark)
        var incomeScale = a.Income <= 0 ? 1.0 : (double)a.Income;

        var incomeRel = Math.Abs((double)(c.MonthlyIncome - a.Income)) / incomeScale;
        var expenseRel = Math.Abs((double)(c.MonthlyExpenses - a.MonthlyExpenses)) / incomeScale;
        var ageNorm = Math.Abs(c.Age - a.Age) / 40.0;          // ~40 yıllık aralığa göre
        var childrenNorm = Math.Abs(c.ChildrenCount - a.ChildrenCount) / 5.0;
        var housingDiff = c.HousingStatus == a.HousingStatus ? 0.0 : 1.0;
        var maritalDiff = c.MaritalStatus == a.MaritalStatus ? 0.0 : 1.0;

        // Ağırlıklar: gelir en belirleyici; konut/gider orta; yaş/medeni/çocuk daha hafif
        return (2.0 * incomeRel)
             + (1.0 * expenseRel)
             + (0.7 * housingDiff)
             + (0.5 * ageNorm)
             + (0.3 * maritalDiff)
             + (0.3 * childrenNorm);
    }
}
