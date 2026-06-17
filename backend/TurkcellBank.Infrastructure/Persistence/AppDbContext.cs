using Microsoft.EntityFrameworkCore;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Infrastructure.Persistence;

/// <summary>
/// AppDbContext: EF Core'un veritabanına açılan kapısı.
/// DbSet'ler = tablolar. OnModelCreating = tablo kuralları (unique, ilişki vb.).
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Transaction> Transactions => Set<Transaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // --- User tablosu kuralları ---
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);

            entity.Property(u => u.FullName).IsRequired().HasMaxLength(150);

            entity.Property(u => u.Email).IsRequired().HasMaxLength(256);
            entity.HasIndex(u => u.Email).IsUnique(); // aynı e-posta iki kez olamaz

            entity.Property(u => u.PasswordHash).IsRequired();

            // enum'u veritabanında okunabilir metin olarak sakla ("Customer"/"Admin")
            entity.Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
        });

        // --- Account tablosu kuralları ---
        modelBuilder.Entity<Account>(entity =>
        {
            entity.HasKey(a => a.Id);

            entity.Property(a => a.Iban).IsRequired().HasMaxLength(34);
            entity.HasIndex(a => a.Iban).IsUnique(); // IBAN benzersiz

            entity.Property(a => a.AccountType).HasConversion<string>().HasMaxLength(20);

            entity.Property(a => a.Balance).HasPrecision(18, 2); // para hassasiyeti

            // İlişki: Account -> User (çok hesap, tek kullanıcı).
            // Kullanıcı silinirse hesapları da silinir (Cascade).
            entity.HasOne(a => a.User)
                .WithMany(u => u.Accounts)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Transaction tablosu kuralları ---
        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasKey(t => t.Id);

            entity.Property(t => t.Type).HasConversion<string>().HasMaxLength(20);
            entity.Property(t => t.Amount).HasPrecision(18, 2);
            entity.Property(t => t.Description).HasMaxLength(200);
            entity.Property(t => t.FromIban).HasMaxLength(34);
            entity.Property(t => t.ToIban).HasMaxLength(34);

            // Geçmiş sorguları FromAccountId/ToAccountId üzerinden yapılır
            entity.HasIndex(t => t.FromAccountId);
            entity.HasIndex(t => t.ToAccountId);
        });
    }
}
