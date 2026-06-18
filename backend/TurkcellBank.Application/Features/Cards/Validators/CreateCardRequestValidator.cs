using FluentValidation;
using TurkcellBank.Application.Features.Cards.Dtos;

namespace TurkcellBank.Application.Features.Cards.Validators;

public class CreateCardRequestValidator : AbstractValidator<CreateCardRequest>
{
    public CreateCardRequestValidator()
    {
        RuleFor(x => x.AccountId)
            .NotEmpty().WithMessage("Bir hesap seçin.");
    }
}
