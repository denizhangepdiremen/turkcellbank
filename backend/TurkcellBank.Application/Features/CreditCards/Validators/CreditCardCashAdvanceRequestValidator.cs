using FluentValidation;
using TurkcellBank.Application.Features.CreditCards.Dtos;

namespace TurkcellBank.Application.Features.CreditCards.Validators;

public class CreditCardCashAdvanceRequestValidator : AbstractValidator<CreditCardCashAdvanceRequest>
{
    public CreditCardCashAdvanceRequestValidator()
    {
        RuleFor(x => x.CreditCardId).NotEmpty().WithMessage("Kredi kartı seçin.");
        RuleFor(x => x.TargetAccountId).NotEmpty().WithMessage("Paranın aktarılacağı hesabı seçin.");
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Tutar 0'dan büyük olmalı.");
    }
}
