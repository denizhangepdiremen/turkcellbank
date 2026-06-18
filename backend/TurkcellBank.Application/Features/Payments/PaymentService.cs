using FluentValidation;
using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Payments.Dtos;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Payments;

public class PaymentService : IPaymentService
{
    private const string Valid3DSCode = "123456";

    private readonly IPaymentRepository _payments;
    private readonly ICardRepository _cards;
    private readonly IAccountRepository _accounts;
    private readonly ITransactionRepository _transactions;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<PaymentRequest> _validator;

    public PaymentService(
        IPaymentRepository payments,
        ICardRepository cards,
        IAccountRepository accounts,
        ITransactionRepository transactions,
        ICurrentUserService currentUser,
        IValidator<PaymentRequest> validator)
    {
        _payments = payments;
        _cards = cards;
        _accounts = accounts;
        _transactions = transactions;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<PaymentDto> PayAsync(PaymentRequest request)
    {
        var validation = await _validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new Common.Exceptions.ValidationException(
                validation.Errors.Select(e => e.ErrorMessage).ToList());

        // 1) Kart bu kullanıcıya mı ait?
        var card = await _cards.GetByIdAsync(request.CardId);
        if (card is null || card.UserId != _currentUser.UserId)
            throw new NotFoundException("Kart bulunamadı.");

        // 2) Kart onaylı mı?
        if (card.Status != CardStatus.Approved)
            throw new BusinessException("Kartınız henüz onaylı değil.");

        // 3) Bağlı hesap (tracked)
        var account = await _accounts.GetByIdAsync(card.AccountId);
        if (account is null)
            throw new NotFoundException("Karta bağlı hesap bulunamadı.");
        if (!account.IsActive)
            throw new BusinessException("Karta bağlı hesap kapalı.");

        var masked = CardHelper.Mask(card.CardNumber);

        // 4) 3D Secure kodu yanlışsa: başarısız kaydı oluştur + hata
        if (request.ThreeDSCode != Valid3DSCode)
        {
            await _payments.AddAsync(new Payment
            {
                Id = Guid.NewGuid(),
                UserId = _currentUser.UserId,
                CardId = card.Id,
                AccountId = account.Id,
                MaskedCardNumber = masked,
                Amount = request.Amount,
                Status = PaymentStatus.Failed,
                Description = request.Description,
                CreatedAt = DateTime.UtcNow,
            });
            throw new BusinessException("3D Secure kodu hatalı.");
        }

        // 5) Bakiye yeterli mi?
        if (account.Balance < request.Amount)
            throw new BusinessException("Yetersiz bakiye.");

        // 6) Başarılı ödeme: hesaptan düş + ödeme kaydı + işlem kaydı (atomik)
        account.Balance -= request.Amount;

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            UserId = _currentUser.UserId,
            CardId = card.Id,
            AccountId = account.Id,
            MaskedCardNumber = masked,
            Amount = request.Amount,
            Status = PaymentStatus.Success,
            Description = request.Description,
            CreatedAt = DateTime.UtcNow,
        };
        _payments.Add(payment); // kaydetmez

        var tx = new Transaction
        {
            Id = Guid.NewGuid(),
            Type = TransactionType.Payment,
            FromAccountId = account.Id,
            FromIban = account.Iban,
            Amount = request.Amount,
            Description = request.Description ?? "POS ödemesi",
            CreatedAt = DateTime.UtcNow,
        };
        // Tek SaveChanges: bakiye + ödeme + işlem birlikte
        await _transactions.AddAsync(tx);

        return Map(payment);
    }

    public async Task<List<PaymentDto>> GetMyPaymentsAsync()
    {
        var payments = await _payments.GetByUserIdAsync(_currentUser.UserId);
        return payments.Select(Map).ToList();
    }

    public async Task<List<AdminPaymentDto>> GetAllPaymentsAsync()
    {
        var payments = await _payments.GetAllWithUserAsync();
        return payments.Select(p => new AdminPaymentDto(
            p.Id,
            p.User?.FullName ?? "—",
            p.User?.Email ?? "—",
            p.MaskedCardNumber,
            p.Amount,
            p.Status.ToString(),
            p.Description,
            p.CreatedAt)).ToList();
    }

    public async Task<PaymentDto> RefundAsync(Guid id)
    {
        var payment = await _payments.GetByIdAsync(id)
            ?? throw new NotFoundException("Ödeme bulunamadı.");

        if (payment.Status != PaymentStatus.Success)
            throw new BusinessException("Sadece başarılı ödemeler iade edilebilir.");
        if (payment.AccountId is null)
            throw new BusinessException("Bu ödeme iade edilemiyor.");

        var account = await _accounts.GetByIdAsync(payment.AccountId.Value)
            ?? throw new NotFoundException("İade edilecek hesap bulunamadı.");

        // Tutarı hesaba geri yükle + ödeme durumu + iade işlemi (atomik)
        account.Balance += payment.Amount;
        payment.Status = PaymentStatus.Refunded;

        var refundTx = new Transaction
        {
            Id = Guid.NewGuid(),
            Type = TransactionType.Refund,
            ToAccountId = account.Id,
            ToIban = account.Iban,
            Amount = payment.Amount,
            Description = "POS iade",
            CreatedAt = DateTime.UtcNow,
        };
        await _transactions.AddAsync(refundTx);

        return Map(payment);
    }

    private static PaymentDto Map(Payment p) =>
        new(p.Id, p.MaskedCardNumber, p.Amount, p.Status.ToString(), p.Description, p.CreatedAt);
}
