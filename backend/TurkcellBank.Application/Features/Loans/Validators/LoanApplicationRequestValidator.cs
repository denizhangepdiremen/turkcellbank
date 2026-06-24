using FluentValidation;
using TurkcellBank.Application.Features.Loans.Dtos;

namespace TurkcellBank.Application.Features.Loans.Validators;

public class LoanApplicationRequestValidator : AbstractValidator<LoanApplicationRequest>
{
    public LoanApplicationRequestValidator()
    {
        RuleFor(x => x.NationalId)
            .NotEmpty().WithMessage("TC kimlik numarası zorunludur.")
            .Must(IsValidTcKimlik).WithMessage("Geçerli bir TC kimlik numarası girin.");

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

    /// <summary>
    /// TC kimlik no doğrulama (11 hane + resmi algoritma):
    /// 10. hane = ((1.,3.,5.,7.,9. toplamı) * 7 - (2.,4.,6.,8. toplamı)) mod 10
    /// 11. hane = (ilk 10 hanenin toplamı) mod 10
    /// </summary>
    private static bool IsValidTcKimlik(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var tc = value.Trim();
        if (tc.Length != 11 || !tc.All(char.IsDigit)) return false;
        if (tc[0] == '0') return false;

        var d = tc.Select(ch => ch - '0').ToArray();
        var oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
        var evenSum = d[1] + d[3] + d[5] + d[7];
        var tenth = ((oddSum * 7) - evenSum) % 10;
        if (tenth < 0) tenth += 10;
        if (tenth != d[9]) return false;

        var first10Sum = d.Take(10).Sum();
        return first10Sum % 10 == d[10];
    }
}
