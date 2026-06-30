using FluentValidation;
using TurkcellBank.Application.Features.Fx.Dtos;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Fx.Validators;

/// <summary>Döviz/altın işlem isteği doğrulama (format/zorunluluk kuralları).</summary>
public class FxTradeRequestValidator : AbstractValidator<FxTradeRequest>
{
    public FxTradeRequestValidator()
    {
        RuleFor(x => x.Side).IsInEnum().WithMessage("Geçerli bir işlem yönü seçin.");

        RuleFor(x => x.Currency)
            .Must(c => c != Currency.TRY && System.Enum.IsDefined(c))
            .WithMessage("Geçerli bir döviz/altın birimi seçin.");

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Miktar sıfırdan büyük olmalı.");

        RuleFor(x => x.TryAccountId)
            .NotEmpty().WithMessage("TL hesabı seçin.");
    }
}
