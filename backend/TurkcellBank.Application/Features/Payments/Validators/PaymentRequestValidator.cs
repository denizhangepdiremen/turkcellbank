using FluentValidation;
using TurkcellBank.Application.Features.Payments.Dtos;

namespace TurkcellBank.Application.Features.Payments.Validators;

public class PaymentRequestValidator : AbstractValidator<PaymentRequest>
{
    public PaymentRequestValidator()
    {
        RuleFor(x => x.CardId).NotEmpty().WithMessage("Kart seçin.");
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Tutar 0'dan büyük olmalı.");
        RuleFor(x => x.ThreeDSCode).NotEmpty().WithMessage("3D Secure kodu zorunlu.");
    }
}
