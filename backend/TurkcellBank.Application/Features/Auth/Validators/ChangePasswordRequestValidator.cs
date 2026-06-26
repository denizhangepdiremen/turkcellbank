using FluentValidation;
using TurkcellBank.Application.Features.Auth.Dtos;

namespace TurkcellBank.Application.Features.Auth.Validators;

/// <summary>
/// Şifre değiştirme doğrulama kuralları. Yeni şifre kayıt ile aynı kuralda
/// (en az 6 karakter) ve mevcut şifreden farklı olmalı.
/// </summary>
public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty().WithMessage("Mevcut şifre zorunludur.");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("Yeni şifre zorunludur.")
            .MinimumLength(6).WithMessage("Yeni şifre en az 6 karakter olmalı.");

        RuleFor(x => x.NewPassword)
            .NotEqual(x => x.CurrentPassword)
            .WithMessage("Yeni şifre mevcut şifreden farklı olmalı.");
    }
}
