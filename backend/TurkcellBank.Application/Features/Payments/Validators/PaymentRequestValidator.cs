using FluentValidation;
using TurkcellBank.Application.Features.Payments.Dtos;

namespace TurkcellBank.Application.Features.Payments.Validators;

// Sadece FORMAT doğrulaması. Kartın/3DS kodunun "doğru" olup olmadığı
// iş mantığıdır (servis Failed kaydı oluşturur), validation hatası değil.
public class PaymentRequestValidator : AbstractValidator<PaymentRequest>
{
    public PaymentRequestValidator()
    {
        RuleFor(x => x.CardNumber)
            .NotEmpty().WithMessage("Kart numarası zorunlu.");
        RuleFor(x => x.Cvv)
            .NotEmpty().WithMessage("CVV zorunlu.")
            .Matches(@"^\d{3,4}$").WithMessage("CVV 3-4 haneli olmalı.");
        RuleFor(x => x.ExpiryMonth)
            .InclusiveBetween(1, 12).WithMessage("Geçerli bir ay girin.");
        RuleFor(x => x.ExpiryYear)
            .GreaterThanOrEqualTo(DateTime.UtcNow.Year).WithMessage("Kartın süresi geçmiş.");
        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Tutar 0'dan büyük olmalı.");
        RuleFor(x => x.ThreeDSCode)
            .NotEmpty().WithMessage("3D Secure kodu zorunlu.");
    }
}
