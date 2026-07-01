using FluentValidation;
using TurkcellBank.Application.Features.CreditCards.Dtos;

namespace TurkcellBank.Application.Features.CreditCards.Validators;

public class CreditCardApplicationRequestValidator : AbstractValidator<CreditCardApplicationRequest>
{
    public CreditCardApplicationRequestValidator()
    {
        RuleFor(x => x.NationalId)
            .NotEmpty().WithMessage("TC kimlik numarası zorunlu.")
            .Length(11).WithMessage("TC kimlik numarası 11 haneli olmalı.");
        RuleFor(x => x.Age).InclusiveBetween(18, 100).WithMessage("Yaş 18-100 aralığında olmalı.");
        RuleFor(x => x.ChildrenCount).InclusiveBetween(0, 20).WithMessage("Çocuk sayısı geçersiz.");
        RuleFor(x => x.Income).GreaterThan(0).WithMessage("Aylık gelir 0'dan büyük olmalı.");
        RuleFor(x => x.MonthlyExpenses).GreaterThanOrEqualTo(0).WithMessage("Aylık gider negatif olamaz.");
        RuleFor(x => x.EmploymentMonths).GreaterThanOrEqualTo(0).WithMessage("Kıdem (ay) negatif olamaz.");
        RuleFor(x => x.Profession).NotEmpty().WithMessage("Meslek zorunlu.").MaximumLength(100);
        RuleFor(x => x.StatementDay).InclusiveBetween(1, 28)
            .WithMessage("Kesim günü her ayın 1-28'i arasında olmalı.");
    }
}
