using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Loans;
using TurkcellBank.Infrastructure.Persistence;
using TurkcellBank.Infrastructure.Persistence.Repositories;
using TurkcellBank.Infrastructure.Security;

namespace TurkcellBank.Infrastructure;

/// <summary>
/// Infrastructure katmanının servislerini (veritabanı vb.) DI konteynerine
/// kaydeden yardımcı sınıf. API'nin Program.cs'inde tek satırla çağrılır:
///     builder.Services.AddInfrastructure(builder.Configuration);
///
/// Böylece API, veritabanı detaylarını bilmeden Infrastructure'ı bağlar.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // appsettings.json'daki "DefaultConnection" ile PostgreSQL'e bağlan
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString));

        // Repository ve güvenlik servisleri (Application arayüzleri -> Infra uygulamaları)
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IAccountRepository, AccountRepository>();
        services.AddScoped<ITransactionRepository, TransactionRepository>();
        services.AddScoped<ILoanRepository, LoanRepository>();
        services.AddScoped<IReferenceCreditRepository, ReferenceCreditRepository>();
        services.AddScoped<IExternalBankLoanRepository, ExternalBankLoanRepository>();
        services.AddScoped<IPaymentRepository, PaymentRepository>();
        services.AddScoped<ICardRepository, CardRepository>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<ITokenService, JwtTokenService>();

        // Kredi değerlendirme motoru. Şimdilik deterministik kural motoru
        // (offline; API key gerekmez, testler tekrarlanabilir). Aşama 2'de
        // Gemini:ApiKey yapılandırılınca GeminiLoanAiEvaluator'a geçilecek.
        services.AddScoped<ILoanAiEvaluator, RuleBasedLoanAiEvaluator>();

        return services;
    }
}
