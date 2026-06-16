using FluentValidation;
using TurkcellBank.Application.Features.Auth.Dtos;

namespace TurkcellBank.Application.Features.Auth.Validators;

/// <summary>Giriş isteği doğrulama: alanlar boş olmamalı.</summary>
public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta zorunludur.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre zorunludur.");
    }
}
