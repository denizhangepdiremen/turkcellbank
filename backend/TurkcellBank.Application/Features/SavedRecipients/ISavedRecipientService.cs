using TurkcellBank.Application.Features.SavedRecipients.Dtos;

namespace TurkcellBank.Application.Features.SavedRecipients;

public interface ISavedRecipientService
{
    Task<List<SavedRecipientDto>> GetMineAsync();
    Task<SavedRecipientDto> CreateAsync(CreateSavedRecipientRequest request);
    Task DeleteAsync(Guid id);
}
