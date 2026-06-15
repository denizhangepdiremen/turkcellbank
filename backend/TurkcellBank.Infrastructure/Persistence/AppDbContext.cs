using Microsoft.EntityFrameworkCore;

namespace TurkcellBank.Infrastructure.Persistence;

/// <summary>
/// AppDbContext: EF Core'un veritabanına açılan kapısı.
/// Tüm tablolar (entity'ler) buraya DbSet olarak eklenecek.
/// Şimdilik boş — entity'ler bir sonraki adımda gelecek.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    // Örnek (ileride):
    // public DbSet<User> Users => Set<User>();
    // public DbSet<Account> Accounts => Set<Account>();
}
