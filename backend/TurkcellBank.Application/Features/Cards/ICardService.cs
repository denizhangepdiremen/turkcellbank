using TurkcellBank.Application.Features.Cards.Dtos;

namespace TurkcellBank.Application.Features.Cards;

public interface ICardService
{
    // --- Müşteri ---
    Task<CardDto> CreateAsync(CreateCardRequest request);
    Task<List<CardDto>> GetMyCardsAsync();

    // --- Admin ---
    Task<List<AdminCardDto>> GetAllCardsAsync();
    Task<CardDto> ApproveAsync(Guid id);
    Task<CardDto> RejectAsync(Guid id);
}
