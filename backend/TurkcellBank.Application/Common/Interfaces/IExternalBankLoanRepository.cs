using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Diğer bankalardaki (fake) kredi kayıtlarına TC kimlik no ile erişim.</summary>
public interface IExternalBankLoanRepository
{
    Task<List<ExternalBankLoan>> GetByNationalIdAsync(string nationalId);
}
