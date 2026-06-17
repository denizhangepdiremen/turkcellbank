using FluentValidation;
using TurkcellBank.Application.Features.Transactions.Dtos;

namespace TurkcellBank.Application.Features.Transactions.Validators;

public class DepositRequestValidator : AbstractValidator<DepositRequest>
{
    public DepositRequestValidator()
    {
        RuleFor(x => x.AccountId).NotEmpty().WithMessage("Hesap seçilmeli.");
        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Tutar 0'dan büyük olmalı.");
    }
}
