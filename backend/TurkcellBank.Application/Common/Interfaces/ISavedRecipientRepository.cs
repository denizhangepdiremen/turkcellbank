using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Kayıtlı alıcı veri erişimi.</summary>
public interface ISavedRecipientRepository
{
    Task AddAsync(SavedRecipient recipient);
    Task<List<SavedRecipient>> GetByUserIdAsync(Guid userId);
    Task<SavedRecipient?> GetByIdAsync(Guid id);
    Task<bool> ExistsByUserIdAndIbanAsync(Guid userId, string iban);
    Task DeleteAsync(SavedRecipient recipient);
}
