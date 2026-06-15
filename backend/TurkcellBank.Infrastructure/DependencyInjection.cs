using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TurkcellBank.Infrastructure.Persistence;

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

        return services;
    }
}
