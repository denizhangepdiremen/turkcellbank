using FluentValidation;
using TurkcellBank.Application.Features.Payments.Dtos;

namespace TurkcellBank.Application.Features.Payments.Validators;

public class PaymentRequestValidator : AbstractValidator<PaymentRequest>
{
    public PaymentRequestValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Tutar 0'dan büyük olmalı.");
        RuleFor(x => x.ThreeDSCode).NotEmpty().WithMessage("3D Secure kodu zorunlu.");

        When(x => x.Instrument == "credit", () =>
        {
            RuleFor(x => x.CreditCardId).NotNull().NotEqual(Guid.Empty)
                .WithMessage("Kredi kartı seçin.");
            RuleFor(x => x.Installments).InclusiveBetween(1, 12)
                .WithMessage("Taksit sayısı 1-12 aralığında olmalı.");
        }).Otherwise(() =>
        {
            RuleFor(x => x.CardId).NotNull().NotEqual(Guid.Empty)
                .WithMessage("Kart seçin.");
        });
    }
}
