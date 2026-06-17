using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using TurkcellBank.Application.Features.Accounts;
using TurkcellBank.Application.Features.Accounts.Dtos;
using TurkcellBank.Application.Features.Accounts.Validators;
using TurkcellBank.Application.Features.Auth;
using TurkcellBank.Application.Features.Auth.Dtos;
using TurkcellBank.Application.Features.Auth.Validators;
using TurkcellBank.Application.Features.Transactions;
using TurkcellBank.Application.Features.Transactions.Dtos;
using TurkcellBank.Application.Features.Transactions.Validators;

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
        services.AddScoped<ITransactionService, TransactionService>();

        // Validator'lar
        services.AddScoped<IValidator<RegisterRequest>, RegisterRequestValidator>();
        services.AddScoped<IValidator<LoginRequest>, LoginRequestValidator>();
        services.AddScoped<IValidator<CreateAccountRequest>, CreateAccountRequestValidator>();
        services.AddScoped<IValidator<DepositRequest>, DepositRequestValidator>();
        services.AddScoped<IValidator<TransferRequest>, TransferRequestValidator>();

        return services;
    }
}
