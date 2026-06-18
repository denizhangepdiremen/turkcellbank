using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Infrastructure.Persistence;

/// <summary>
/// Açılışta temel verileri hazırlar. Şimdilik: sistemde hiç admin yoksa
/// varsayılan bir admin kullanıcı oluşturur.
/// Admin e-posta/şifre değerleri yapılandırmadan gelir
/// (AdminSeed:Email appsettings, AdminSeed:Password user-secrets/env).
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAsync(
        AppDbContext db,
        IPasswordHasher passwordHasher,
        IConfiguration configuration)
    {
        // Zaten admin varsa hiçbir şey yapma
        var adminExists = await db.Users.AnyAsync(u => u.Role == UserRole.Admin);
        if (adminExists) return;

        var email = configuration["AdminSeed:Email"];
        var password = configuration["AdminSeed:Password"];

        // Yapılandırma eksikse seed yapma (sessizce admin oluşturma)
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            return;

        var admin = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Sistem Admin",
            Email = email,
            PasswordHash = passwordHasher.Hash(password),
            Role = UserRole.Admin,
            CreatedAt = DateTime.UtcNow,
        };

        db.Users.Add(admin);
        await db.SaveChangesAsync();
    }
}
