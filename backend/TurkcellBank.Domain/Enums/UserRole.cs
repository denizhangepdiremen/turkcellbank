namespace TurkcellBank.Domain.Enums;

/// <summary>
/// Kullanıcı rolü — RBAC (rol bazlı yetkilendirme) için.
/// JWT token içine bu bilgi konacak; admin endpoint'leri Admin gerektirecek.
/// </summary>
public enum UserRole
{
    Customer,
    Admin,
}
