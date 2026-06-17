using FluentValidation;
using TurkcellBank.Application.Features.Transactions.Dtos;

namespace TurkcellBank.Application.Features.Transactions.Validators;

public class TransferRequestValidator : AbstractValidator<TransferRequest>
{
    public TransferRequestValidator()
    {
        RuleFor(x => x.FromAccountId).NotEmpty().WithMessage("Gönderen hesap seçilmeli.");
        RuleFor(x => x.ToIban)
            .NotEmpty().WithMessage("Alıcı IBAN zorunludur.");
        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Tutar 0'dan büyük olmalı.");
        RuleFor(x => x.Description)
            .MaximumLength(20).WithMessage("Açıklama en fazla 20 karakter.");
    }
}
