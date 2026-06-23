using FluentValidation;
using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Cards.Dtos;
using TurkcellBank.Application.Features.Payments;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Cards;

public class CardService : ICardService
{
    private readonly ICardRepository _cards;
    private readonly IAccountRepository _accounts;
    private readonly IOperationContext _ctx;
    private readonly IValidator<CreateCardRequest> _validator;
    private readonly IAuditLogger _audit;
    private readonly Notifications.INotificationService _notifications;

    public CardService(
        ICardRepository cards,
        IAccountRepository accounts,
        IOperationContext ctx,
        IValidator<CreateCardRequest> validator,
        IAuditLogger audit,
        Notifications.INotificationService notifications)
    {
        _cards = cards;
        _accounts = accounts;
        _ctx = ctx;
        _validator = validator;
        _audit = audit;
        _notifications = notifications;
    }

    public async Task<CardDto> CreateAsync(CreateCardRequest request)
    {
        var validation = await _validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new Common.Exceptions.ValidationException(
                validation.Errors.Select(e => e.ErrorMessage).ToList());

        // Hesap işlemin sahibine mi ait ve aktif mi?
        var account = await _accounts.GetByIdAsync(request.AccountId);
        if (account is null || account.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Hesap bulunamadı.");
        if (!account.IsActive)
            throw new BusinessException("Kapalı hesaba kart açılamaz.");

        // Benzersiz kart numarası üret
        string number;
        do
        {
            number = CardHelper.Generate16Digits();
        }
        while (await _cards.CardNumberExistsAsync(number));

        var now = DateTime.UtcNow;
        var card = new Card
        {
            Id = Guid.NewGuid(),
            UserId = _ctx.ActingUserId,
            AccountId = account.Id,
            CardNumber = number,
            ExpiryMonth = now.Month,
            ExpiryYear = now.Year + 4,
            Cvv = CardHelper.GenerateCvv(),
            Status = CardStatus.Pending, // yetkili onayı bekler
            CreatedAt = now,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };

        await _cards.AddAsync(card);
        return MapCard(card, account.Iban);
    }

    public async Task<List<CardDto>> GetMyCardsAsync()
    {
        var cards = await _cards.GetByUserIdAsync(_ctx.ActingUserId);
        return cards.Select(c => MapCard(c, c.Account?.Iban ?? "—")).ToList();
    }

    public async Task<List<AdminCardDto>> GetAllCardsAsync()
    {
        var cards = await _cards.GetAllWithUserAsync();
        return cards.Select(c => new AdminCardDto(
            c.Id,
            c.User?.FullName ?? "—",
            c.User?.Email ?? "—",
            CardHelper.Mask(c.CardNumber),
            c.Account?.Iban ?? "—",
            c.Status.ToString(),
            c.CreatedAt,
            c.DecidedAt)).ToList();
    }

    public async Task<List<AdminCardDto>> GetPendingCardsAsync()
    {
        var cards = await _cards.GetAllWithUserAsync();
        return cards
            .Where(c => c.Status == CardStatus.Pending)
            .Select(c => new AdminCardDto(
                c.Id,
                c.User?.FullName ?? "—",
                c.User?.Email ?? "—",
                CardHelper.Mask(c.CardNumber),
                c.Account?.Iban ?? "—",
                c.Status.ToString(),
                c.CreatedAt,
                c.DecidedAt))
            .ToList();
    }

    public Task<CardDto> ApproveAsync(Guid id) => DecideAsync(id, CardStatus.Approved);
    public Task<CardDto> RejectAsync(Guid id) => DecideAsync(id, CardStatus.Rejected);

    private async Task<CardDto> DecideAsync(Guid id, CardStatus decision)
    {
        var card = await _cards.GetByIdAsync(id)
            ?? throw new NotFoundException("Kart bulunamadı.");

        if (card.Status != CardStatus.Pending)
            throw new BusinessException("Bu kart zaten karara bağlanmış.");

        card.Status = decision;
        card.DecidedAt = DateTime.UtcNow;
        await _cards.SaveChangesAsync();

        var verdict = decision == CardStatus.Approved ? "onaylandı" : "reddedildi";
        var masked = CardHelper.Mask(card.CardNumber);
        await _audit.LogAsync($"Kart {verdict}", $"{masked} numaralı kart başvurusu {verdict}.");
        await _notifications.NotifyAsync(card.UserId, $"Kartınız {verdict}",
            $"{masked} numaralı kart başvurunuz {verdict}.");

        return MapCard(card, card.Account?.Iban ?? "—");
    }

    private static CardDto MapCard(Card c, string accountIban) =>
        new(c.Id, CardHelper.Mask(c.CardNumber), c.ExpiryMonth, c.ExpiryYear,
            c.Status.ToString(), accountIban, c.CreatedAt);
}
