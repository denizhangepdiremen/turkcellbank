using FluentValidation;
using TurkcellBank.Application.Features.CreditCards.Dtos;

namespace TurkcellBank.Application.Features.CreditCards.Validators;

public class CreditCardLimitIncreaseRequestValidator : AbstractValidator<CreditCardLimitIncreaseRequestDto>
{
    public CreditCardLimitIncreaseRequestValidator()
    {
        RuleFor(x => x.CreditCardId).NotEmpty().WithMessage("Kredi kartı seçin.");
        RuleFor(x => x.RequestedLimit).GreaterThan(0).WithMessage("Talep edilen limit 0'dan büyük olmalı.");
        RuleFor(x => x.Age).InclusiveBetween(18, 100).WithMessage("Yaş 18-100 aralığında olmalı.");
        RuleFor(x => x.ChildrenCount).InclusiveBetween(0, 20).WithMessage("Çocuk sayısı geçersiz.");
        RuleFor(x => x.Income).GreaterThan(0).WithMessage("Aylık gelir 0'dan büyük olmalı.");
        RuleFor(x => x.MonthlyExpenses).GreaterThanOrEqualTo(0).WithMessage("Aylık gider negatif olamaz.");
        RuleFor(x => x.EmploymentMonths).GreaterThanOrEqualTo(0).WithMessage("Kıdem (ay) negatif olamaz.");
        RuleFor(x => x.Profession).NotEmpty().WithMessage("Meslek zorunlu.").MaximumLength(100);
    }
}
