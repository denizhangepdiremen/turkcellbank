using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using TurkcellBank.Application.Features.Accounts;
using TurkcellBank.Application.Features.Accounts.Dtos;
using TurkcellBank.Application.Features.Accounts.Validators;
using TurkcellBank.Application.Features.Auth;
using TurkcellBank.Application.Features.Auth.Dtos;
using TurkcellBank.Application.Features.Auth.Validators;

namespace TurkcellBank.Application;

/// <summary>
/// Application katmanının servislerini DI konteynerine kaydeder.
/// API'nin Program.cs'inde: builder.Services.AddApplication();
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Servisler
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAccountService, AccountService>();

        // Validator'lar
        services.AddScoped<IValidator<RegisterRequest>, RegisterRequestValidator>();
        services.AddScoped<IValidator<LoginRequest>, LoginRequestValidator>();
        services.AddScoped<IValidator<CreateAccountRequest>, CreateAccountRequestValidator>();

        return services;
    }
}
