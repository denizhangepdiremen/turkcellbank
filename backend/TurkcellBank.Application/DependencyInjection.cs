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
        services.AddScoped<Features.Admin.IAdminService, Features.Admin.AdminService>();
        services.AddScoped<Features.Loans.ILoanService, Features.Loans.LoanService>();
        services.AddScoped<Features.Payments.IPaymentService, Features.Payments.PaymentService>();
        services.AddScoped<Features.Cards.ICardService, Features.Cards.CardService>();

        // Validator'lar
        services.AddScoped<IValidator<RegisterRequest>, RegisterRequestValidator>();
        services.AddScoped<IValidator<LoginRequest>, LoginRequestValidator>();
        services.AddScoped<IValidator<UpdateProfileRequest>, UpdateProfileRequestValidator>();
        services.AddScoped<IValidator<CreateAccountRequest>, CreateAccountRequestValidator>();
        services.AddScoped<IValidator<DepositRequest>, DepositRequestValidator>();
        services.AddScoped<IValidator<TransferRequest>, TransferRequestValidator>();
        services.AddScoped<IValidator<Features.Loans.Dtos.LoanApplicationRequest>, Features.Loans.Validators.LoanApplicationRequestValidator>();
        services.AddScoped<IValidator<Features.Payments.Dtos.PaymentRequest>, Features.Payments.Validators.PaymentRequestValidator>();
        services.AddScoped<IValidator<Features.Cards.Dtos.CreateCardRequest>, Features.Cards.Validators.CreateCardRequestValidator>();

        return services;
    }
}
