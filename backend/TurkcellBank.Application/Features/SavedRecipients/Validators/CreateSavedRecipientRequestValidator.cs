using FluentValidation;
using TurkcellBank.Application.Features.SavedRecipients.Dtos;

namespace TurkcellBank.Application.Features.SavedRecipients.Validators;

public class CreateSavedRecipientRequestValidator : AbstractValidator<CreateSavedRecipientRequest>
{
    public CreateSavedRecipientRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Alıcı adı zorunludur.")
            .MaximumLength(80).WithMessage("Alıcı adı en fazla 80 karakter olabilir.");

        RuleFor(x => x.Iban)
            .NotEmpty().WithMessage("IBAN zorunludur.")
            .Must(BeValidIban).WithMessage("Geçerli bir IBAN girin.");

        RuleFor(x => x.Note)
            .MaximumLength(50).WithMessage("Not en fazla 50 karakter olabilir.");
    }

    private static bool BeValidIban(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var iban = value.Replace(" ", "").ToUpperInvariant();
        return iban.Length == 26 && iban.StartsWith("TR") && iban.Skip(2).All(char.IsDigit);
    }
}
