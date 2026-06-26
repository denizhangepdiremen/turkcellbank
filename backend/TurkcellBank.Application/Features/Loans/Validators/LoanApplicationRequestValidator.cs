using FluentValidation;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Loans.Dtos;

namespace TurkcellBank.Application.Features.Loans.Validators;

public class LoanApplicationRequestValidator : AbstractValidator<LoanApplicationRequest>
{
    public LoanApplicationRequestValidator()
    {
        RuleFor(x => x.NationalId)
            .NotEmpty().WithMessage("TC kimlik numarası zorunludur.")
            .Must(TcKimlikValidator.IsValid).WithMessage("TC kimlik numarası 11 haneli olmalı.");

        RuleFor(x => x.Age)
            .InclusiveBetween(18, 75).WithMessage("Yaş 18-75 arasında olmalı.");

        RuleFor(x => x.MaritalStatus)
            .IsInEnum().WithMessage("Medeni hal geçersiz.");

        RuleFor(x => x.ChildrenCount)
            .InclusiveBetween(0, 15).WithMessage("Çocuk sayısı 0-15 arasında olmalı.");

        RuleFor(x => x.HousingStatus)
            .IsInEnum().WithMessage("Konut durumu geçersiz.");

        RuleFor(x => x.Income)
            .GreaterThan(0).WithMessage("Gelir 0'dan büyük olmalı.");

        RuleFor(x => x.MonthlyExpenses)
            .GreaterThanOrEqualTo(0).WithMessage("Aylık gider negatif olamaz.");

        RuleFor(x => x.EmploymentMonths)
            .InclusiveBetween(0, 600).WithMessage("Çalışma kıdemi (ay) geçersiz.");

        RuleFor(x => x.Profession)
            .NotEmpty().WithMessage("Meslek zorunludur.")
            .MaximumLength(100).WithMessage("Meslek en fazla 100 karakter.");

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Kredi tutarı 0'dan büyük olmalı.");

        RuleFor(x => x.TermMonths)
            .InclusiveBetween(3, 60).WithMessage("Vade 3-60 ay arasında olmalı.");

        RuleFor(x => x.DisbursementAccountId)
            .NotEmpty().WithMessage("Kredinin yatırılacağı hesabı seçin.");
    }

}
