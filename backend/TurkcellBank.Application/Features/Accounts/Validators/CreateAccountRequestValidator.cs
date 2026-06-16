using FluentValidation;
using TurkcellBank.Application.Features.Accounts.Dtos;

namespace TurkcellBank.Application.Features.Accounts.Validators;

/// <summary>Hesap açma isteği doğrulama: geçerli bir hesap tipi seçilmeli.</summary>
public class CreateAccountRequestValidator : AbstractValidator<CreateAccountRequest>
{
    public CreateAccountRequestValidator()
    {
        RuleFor(x => x.AccountType)
            .IsInEnum().WithMessage("Geçerli bir hesap tipi seçin.");
    }
}
