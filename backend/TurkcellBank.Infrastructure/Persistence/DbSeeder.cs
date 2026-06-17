using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Infrastructure.Persistence;

/// <summary>
/// Açılışta temel verileri hazırlar. Şimdilik: sistemde hiç admin yoksa
/// varsayılan bir admin kullanıcı oluşturur.
/// </summary>
public static class DbSeeder
{
    public const string AdminEmail = "admin@turkcellbank.com";
    private const string AdminPassword = "Admin123!";

    public static async Task SeedAsync(AppDbContext db, IPasswordHasher passwordHasher)
    {
        // Zaten admin varsa hiçbir şey yapma
        var adminExists = await db.Users.AnyAsync(u => u.Role == UserRole.Admin);
        if (adminExists) return;

        var admin = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Sistem Admin",
            Email = AdminEmail,
            PasswordHash = passwordHasher.Hash(AdminPassword),
            Role = UserRole.Admin,
            CreatedAt = DateTime.UtcNow,
        };

        db.Users.Add(admin);
        await db.SaveChangesAsync();
    }
}
