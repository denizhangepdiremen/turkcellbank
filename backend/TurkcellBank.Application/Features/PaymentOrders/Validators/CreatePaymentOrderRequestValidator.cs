using FluentValidation;
using TurkcellBank.Application.Features.PaymentOrders.Dtos;

namespace TurkcellBank.Application.Features.PaymentOrders.Validators;

public class CreatePaymentOrderRequestValidator : AbstractValidator<CreatePaymentOrderRequest>
{
    public CreatePaymentOrderRequestValidator()
    {
        RuleFor(x => x.Type)
            .Must(t => t is "AutoBill" or "RecurringTransfer")
            .WithMessage("Talimat tipi geçersiz.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Talimat adı zorunludur.")
            .MaximumLength(60).WithMessage("Talimat adı en fazla 60 karakter olabilir.");

        RuleFor(x => x.SourceAccountId)
            .NotEmpty().WithMessage("Ödeme yapılacak hesabı seçiniz.");

        RuleFor(x => x.DayOfMonth)
            .InclusiveBetween(1, 28).WithMessage("Ödeme günü 1-28 arası olmalıdır.");

        // --- AutoBill kuralları ---
        When(x => x.Type == "AutoBill", () =>
        {
            RuleFor(x => x.BillerCode)
                .NotEmpty().WithMessage("Kurum seçiniz.");

            RuleFor(x => x.SubscriberNo)
                .NotEmpty().WithMessage("Abone/tesisat no zorunludur.")
                .Must(s => s != null && s.All(char.IsDigit)).WithMessage("Abone no yalnızca rakamlardan oluşmalıdır.")
                .Must(s => s != null && s.Length is >= 6 and <= 20)
                .WithMessage("Abone no 6-20 hane olmalıdır.");
        });

        // --- RecurringTransfer kuralları ---
        When(x => x.Type == "RecurringTransfer", () =>
        {
            RuleFor(x => x.TargetIban)
                .NotEmpty().WithMessage("Alıcı IBAN zorunludur.")
                .Must(BeValidIban).WithMessage("Geçerli bir IBAN girin.");

            RuleFor(x => x.Amount)
                .NotNull().WithMessage("Tutar zorunludur.")
                .GreaterThan(0).WithMessage("Tutar 0'dan büyük olmalıdır.");
        });
    }

    private static bool BeValidIban(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var iban = value.Replace(" ", "").ToUpperInvariant();
        return iban.Length == 26 && iban.StartsWith("TR") && iban.Skip(2).All(char.IsDigit);
    }
}
