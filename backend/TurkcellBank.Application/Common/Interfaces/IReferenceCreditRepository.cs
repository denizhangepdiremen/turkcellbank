using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Referans nüfus (fake) kredi kayıtlarına erişim.</summary>
public interface IReferenceCreditRepository
{
    /// <summary>
    /// Gelir bandına yakın bir ADAY HAVUZU getirir (index'li, hızlı). Nihai
    /// benzerlik sıralaması (gelir+gider+yaş+konut...) Application katmanında
    /// <c>PeerMatcher</c> ile yapılır. En fazla <paramref name="poolSize"/> kayıt döner.
    /// </summary>
    Task<List<ReferenceCreditRecord>> GetCandidatesByIncomeAsync(decimal income, int poolSize);
}
