using FluentValidation;
using TurkcellBank.Application.Features.Auth.Dtos;

namespace TurkcellBank.Application.Features.Auth.Validators;

public class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Ad Soyad zorunludur.")
            .MinimumLength(3).WithMessage("Ad Soyad en az 3 karakter olmalı.")
            .MaximumLength(150).WithMessage("Ad Soyad en fazla 150 karakter.");
    }
}
