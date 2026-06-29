using FluentValidation;
using TurkcellBank.Application.Features.Bills.Dtos;

namespace TurkcellBank.Application.Features.Bills.Validators;

public class PayBillRequestValidator : AbstractValidator<PayBillRequest>
{
    public PayBillRequestValidator()
    {
        RuleFor(x => x.BillerCode)
            .NotEmpty().WithMessage("Kurum seçiniz.");

        RuleFor(x => x.SubscriberNo)
            .NotEmpty().WithMessage("Abone/tesisat no zorunludur.")
            .Must(s => s != null && s.All(char.IsDigit)).WithMessage("Abone no yalnızca rakamlardan oluşmalıdır.")
            .Must(s => s != null && s.Length is >= 6 and <= 20)
            .WithMessage("Abone no 6-20 hane olmalıdır.");

        RuleFor(x => x.AccountId)
            .NotEmpty().WithMessage("Ödeme yapılacak hesabı seçiniz.");
    }
}
