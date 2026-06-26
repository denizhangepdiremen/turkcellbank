using FluentValidation;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Auth.Dtos;

namespace TurkcellBank.Application.Features.Auth.Validators;

/// <summary>
/// Kayıt isteği doğrulama kuralları (server-side validation).
/// FluentValidation: her alan için okunabilir kurallar + Türkçe mesajlar.
/// </summary>
public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Ad Soyad zorunludur.")
            .MinimumLength(3).WithMessage("Ad Soyad en az 3 karakter olmalı.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta zorunludur.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi girin.");

        RuleFor(x => x.NationalId)
            .NotEmpty().WithMessage("TC kimlik numarası zorunludur.")
            .Must(TcKimlikValidator.IsValid).WithMessage("TC kimlik numarası 11 haneli olmalı.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre zorunludur.")
            .MinimumLength(6).WithMessage("Şifre en az 6 karakter olmalı.");
    }
}
