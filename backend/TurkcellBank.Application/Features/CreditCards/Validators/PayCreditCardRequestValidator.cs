using FluentValidation;
using TurkcellBank.Application.Features.CreditCards.Dtos;

namespace TurkcellBank.Application.Features.CreditCards.Validators;

public class PayCreditCardRequestValidator : AbstractValidator<PayCreditCardRequest>
{
    public PayCreditCardRequestValidator()
    {
        RuleFor(x => x.CreditCardId).NotEmpty().WithMessage("Kredi kartı seçin.");
        RuleFor(x => x.SourceAccountId).NotEmpty().WithMessage("Ödeme yapılacak hesabı seçin.");
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Tutar 0'dan büyük olmalı.");
    }
}
