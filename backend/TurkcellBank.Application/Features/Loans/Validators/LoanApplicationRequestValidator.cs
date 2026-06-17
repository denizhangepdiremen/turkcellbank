using FluentValidation;
using TurkcellBank.Application.Features.Loans.Dtos;

namespace TurkcellBank.Application.Features.Loans.Validators;

public class LoanApplicationRequestValidator : AbstractValidator<LoanApplicationRequest>
{
    public LoanApplicationRequestValidator()
    {
        RuleFor(x => x.Income)
            .GreaterThan(0).WithMessage("Gelir 0'dan büyük olmalı.");
        RuleFor(x => x.Profession)
            .NotEmpty().WithMessage("Meslek zorunludur.")
            .MaximumLength(100).WithMessage("Meslek en fazla 100 karakter.");
        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Kredi tutarı 0'dan büyük olmalı.");
        RuleFor(x => x.TermMonths)
            .InclusiveBetween(3, 60).WithMessage("Vade 3-60 ay arasında olmalı.");
    }
}
