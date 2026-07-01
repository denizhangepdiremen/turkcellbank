using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using TurkcellBank.Application.Features.Accounts;
using TurkcellBank.Application.Features.Accounts.Dtos;
using TurkcellBank.Application.Features.Accounts.Validators;
using TurkcellBank.Application.Features.Auth;
using TurkcellBank.Application.Features.Auth.Dtos;
using TurkcellBank.Application.Features.Auth.Validators;
using TurkcellBank.Application.Features.SavedRecipients;
using TurkcellBank.Application.Features.SavedRecipients.Dtos;
using TurkcellBank.Application.Features.SavedRecipients.Validators;
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
        services.AddScoped<Features.Transactions.ITransferApprovalService, Features.Transactions.TransferApprovalService>();
        services.AddScoped<Features.Admin.IAdminService, Features.Admin.AdminService>();
        services.AddScoped<Features.Loans.ILoanService, Features.Loans.LoanService>();
        services.AddScoped<Features.Branch.IBranchService, Features.Branch.BranchService>();
        services.AddScoped<Features.Org.IOrgService, Features.Org.OrgService>();
        services.AddScoped<Features.Management.IManagerService, Features.Management.ManagerService>();
        services.AddScoped<Common.Interfaces.IAuditLogger, Features.Audit.AuditLogger>();
        services.AddScoped<Features.Audit.IAuditService, Features.Audit.AuditService>();
        services.AddScoped<Features.Notifications.INotificationService, Features.Notifications.NotificationService>();
        services.AddScoped<Features.Payments.IPaymentService, Features.Payments.PaymentService>();
        services.AddScoped<Features.Cards.ICardService, Features.Cards.CardService>();
        services.AddScoped<ISavedRecipientService, SavedRecipientService>();
        services.AddScoped<Features.Bills.IBillService, Features.Bills.BillService>();
        services.AddScoped<Features.PaymentOrders.IPaymentOrderService, Features.PaymentOrders.PaymentOrderService>();
        services.AddScoped<Features.PaymentOrders.IPaymentOrderExecutor, Features.PaymentOrders.PaymentOrderExecutor>();
        services.AddScoped<Features.TimeDeposits.ITimeDepositService, Features.TimeDeposits.TimeDepositService>();
        services.AddScoped<Features.TimeDeposits.ITimeDepositMaturityProcessor, Features.TimeDeposits.TimeDepositMaturityProcessor>();
        services.AddScoped<Features.Fx.IFxService, Features.Fx.FxService>();
        services.AddScoped<Features.Fx.IExchangeRateUpdater, Features.Fx.ExchangeRateUpdater>();
        services.AddScoped<Features.CreditCards.ICreditCardService, Features.CreditCards.CreditCardService>();
        services.AddScoped<Features.CreditCards.ICreditCardStatementProcessor, Features.CreditCards.CreditCardStatementProcessor>();

        // Validator'lar
        services.AddScoped<IValidator<RegisterRequest>, RegisterRequestValidator>();
        services.AddScoped<IValidator<LoginRequest>, LoginRequestValidator>();
        services.AddScoped<IValidator<UpdateProfileRequest>, UpdateProfileRequestValidator>();
        services.AddScoped<IValidator<ChangePasswordRequest>, ChangePasswordRequestValidator>();
        services.AddScoped<IValidator<CreateAccountRequest>, CreateAccountRequestValidator>();
        services.AddScoped<IValidator<DepositRequest>, DepositRequestValidator>();
        services.AddScoped<IValidator<TransferRequest>, TransferRequestValidator>();
        services.AddScoped<IValidator<Features.Loans.Dtos.LoanApplicationRequest>, Features.Loans.Validators.LoanApplicationRequestValidator>();
        services.AddScoped<IValidator<Features.Payments.Dtos.PaymentRequest>, Features.Payments.Validators.PaymentRequestValidator>();
        services.AddScoped<IValidator<Features.Cards.Dtos.CreateCardRequest>, Features.Cards.Validators.CreateCardRequestValidator>();
        services.AddScoped<IValidator<CreateSavedRecipientRequest>, CreateSavedRecipientRequestValidator>();
        services.AddScoped<IValidator<Features.Bills.Dtos.BillInquiryRequest>, Features.Bills.Validators.BillInquiryRequestValidator>();
        services.AddScoped<IValidator<Features.Bills.Dtos.PayBillRequest>, Features.Bills.Validators.PayBillRequestValidator>();
        services.AddScoped<IValidator<Features.PaymentOrders.Dtos.CreatePaymentOrderRequest>, Features.PaymentOrders.Validators.CreatePaymentOrderRequestValidator>();
        services.AddScoped<IValidator<Features.TimeDeposits.Dtos.OpenTimeDepositRequest>, Features.TimeDeposits.Validators.OpenTimeDepositRequestValidator>();
        services.AddScoped<IValidator<Features.Fx.Dtos.FxTradeRequest>, Features.Fx.Validators.FxTradeRequestValidator>();
        services.AddScoped<IValidator<Features.CreditCards.Dtos.CreditCardApplicationRequest>, Features.CreditCards.Validators.CreditCardApplicationRequestValidator>();
        services.AddScoped<IValidator<Features.CreditCards.Dtos.PayCreditCardRequest>, Features.CreditCards.Validators.PayCreditCardRequestValidator>();
        services.AddScoped<IValidator<Features.CreditCards.Dtos.CreditCardCashAdvanceRequest>, Features.CreditCards.Validators.CreditCardCashAdvanceRequestValidator>();
        services.AddScoped<IValidator<Features.CreditCards.Dtos.CreditCardLimitIncreaseRequestDto>, Features.CreditCards.Validators.CreditCardLimitIncreaseRequestValidator>();

        return services;
    }
}
