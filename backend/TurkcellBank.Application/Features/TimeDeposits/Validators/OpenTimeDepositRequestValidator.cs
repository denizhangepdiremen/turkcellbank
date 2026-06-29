using FluentValidation;
using TurkcellBank.Application.Features.TimeDeposits.Dtos;

namespace TurkcellBank.Application.Features.TimeDeposits.Validators;

public class OpenTimeDepositRequestValidator : AbstractValidator<OpenTimeDepositRequest>
{
    public OpenTimeDepositRequestValidator()
    {
        RuleFor(x => x.SourceAccountId)
            .NotEmpty().WithMessage("Hesap seçiniz.");

        RuleFor(x => x.Principal)
            .GreaterThanOrEqualTo(TimeDepositProducts.MinPrincipal)
            .WithMessage($"En düşük tutar {TimeDepositProducts.MinPrincipal:N0} TL'dir.");

        RuleFor(x => x.TermDays)
            .Must(t => TimeDepositProducts.Find(t) != null)
            .WithMessage("Geçersiz vade seçimi.");
    }
}
