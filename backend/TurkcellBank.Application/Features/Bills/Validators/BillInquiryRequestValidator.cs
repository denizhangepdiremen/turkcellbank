using FluentValidation;
using TurkcellBank.Application.Features.Bills.Dtos;

namespace TurkcellBank.Application.Features.Bills.Validators;

public class BillInquiryRequestValidator : AbstractValidator<BillInquiryRequest>
{
    public BillInquiryRequestValidator()
    {
        RuleFor(x => x.BillerCode)
            .NotEmpty().WithMessage("Kurum seçiniz.");

        RuleFor(x => x.SubscriberNo)
            .NotEmpty().WithMessage("Abone/tesisat no zorunludur.")
            .Must(BeNumeric).WithMessage("Abone no yalnızca rakamlardan oluşmalıdır.")
            .Must(s => s != null && s.Length is >= 6 and <= 20)
            .WithMessage("Abone no 6-20 hane olmalıdır.");
    }

    protected static bool BeNumeric(string? value) =>
        !string.IsNullOrEmpty(value) && value.All(char.IsDigit);
}
