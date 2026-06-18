using FluentValidation;
using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Payments.Dtos;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Payments;

public class PaymentService : IPaymentService
{
    // Sabit simülasyon kuralları (kilitli kararlar)
    private const string ValidCard = "1234567890123456";
    private const string Valid3DSCode = "123456";
    private const int FraudFailLimit = 3; // aynı kartla 3 başarısız -> blokaj

    private readonly IPaymentRepository _payments;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<PaymentRequest> _validator;

    public PaymentService(
        IPaymentRepository payments,
        ICurrentUserService currentUser,
        IValidator<PaymentRequest> validator)
    {
        _payments = payments;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<PaymentDto> PayAsync(PaymentRequest request)
    {
        var validation = await _validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new Common.Exceptions.ValidationException(
                validation.Errors.Select(e => e.ErrorMessage).ToList());

        var normalized = CardHelper.Normalize(request.CardNumber);
        var fingerprint = CardHelper.Fingerprint(normalized);
        var masked = CardHelper.Mask(normalized);

        // 1) Fraud: bu kartla çok sayıda başarısız işlem varsa blokaj
        var failedCount = await _payments.CountFailedByFingerprintAsync(fingerprint);
        if (failedCount >= FraudFailLimit)
            throw new BusinessException("Bu kart çok sayıda başarısız işlem nedeniyle bloke edildi.");

        // 2) Kart kontrolü
        if (normalized != ValidCard)
        {
            await RecordFailedAsync(masked, fingerprint, request);
            throw new BusinessException("Kart bilgileri hatalı.");
        }

        // 3) 3D Secure kod kontrolü
        if (request.ThreeDSCode != Valid3DSCode)
        {
            await RecordFailedAsync(masked, fingerprint, request);
            throw new BusinessException("3D Secure kodu hatalı.");
        }

        // 4) Başarılı ödeme
        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            UserId = _currentUser.UserId,
            MaskedCardNumber = masked,
            CardFingerprint = fingerprint,
            Amount = request.Amount,
            Status = PaymentStatus.Success,
            Description = request.Description,
            CreatedAt = DateTime.UtcNow,
        };
        await _payments.AddAsync(payment);
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

        payment.Status = PaymentStatus.Refunded;
        await _payments.SaveChangesAsync();
        return Map(payment);
    }

    // Başarısız ödeme kaydı (fraud sayımı bunları sayar)
    private async Task RecordFailedAsync(string masked, string fingerprint, PaymentRequest request)
    {
        var failed = new Payment
        {
            Id = Guid.NewGuid(),
            UserId = _currentUser.UserId,
            MaskedCardNumber = masked,
            CardFingerprint = fingerprint,
            Amount = request.Amount,
            Status = PaymentStatus.Failed,
            Description = request.Description,
            CreatedAt = DateTime.UtcNow,
        };
        await _payments.AddAsync(failed);
    }

    private static PaymentDto Map(Payment p) =>
        new(p.Id, p.MaskedCardNumber, p.Amount, p.Status.ToString(), p.Description, p.CreatedAt);
}
