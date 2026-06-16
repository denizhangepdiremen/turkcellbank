using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Kullanıcı (müşteri veya admin). Sisteme kayıt olan kişi.
/// </summary>
public class User
{
    public Guid Id { get; set; }

    public string FullName { get; set; } = string.Empty;

    // Giriş için kullanılır; sistemde benzersiz (unique) olacak.
    public string Email { get; set; } = string.Empty;

    // BCrypt ile hash'lenmiş şifre — asla düz metin saklanmaz.
    public string PasswordHash { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.Customer;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // İlişki: bir kullanıcının birden çok hesabı olabilir.
    public ICollection<Account> Accounts { get; set; } = new List<Account>();
}
