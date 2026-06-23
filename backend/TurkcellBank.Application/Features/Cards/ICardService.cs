using TurkcellBank.Application.Features.Cards.Dtos;

namespace TurkcellBank.Application.Features.Cards;

public interface ICardService
{
    // --- Müşteri ---
    Task<CardDto> CreateAsync(CreateCardRequest request);
    Task<List<CardDto>> GetMyCardsAsync();

    // --- Admin (teknik, salt-okunur) ---
    Task<List<AdminCardDto>> GetAllCardsAsync();

    // --- Şube müdürü onayı ---
    Task<List<AdminCardDto>> GetPendingCardsAsync();
    Task<CardDto> ApproveAsync(Guid id);
    Task<CardDto> RejectAsync(Guid id);
}
