using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Referans nüfus (fake) kredi kayıtlarına erişim.</summary>
public interface IReferenceCreditRepository
{
    /// <summary>
    /// Verilen gelire yakın (benzer profil) referans kayıtları getirir.
    /// En fazla <paramref name="maxCount"/> kayıt döner (değerlendirme bağlamı için).
    /// </summary>
    Task<List<ReferenceCreditRecord>> GetSimilarByIncomeAsync(decimal income, int maxCount);
}
