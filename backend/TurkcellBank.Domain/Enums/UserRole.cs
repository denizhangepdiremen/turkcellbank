namespace TurkcellBank.Domain.Enums;

/// <summary>
/// Kullanıcı rolü — RBAC (rol bazlı yetkilendirme) için.
/// JWT token içine bu bilgi konacak; endpoint'ler ilgili rolü gerektirecek.
///
/// İki ana taraf vardır:
///  - <see cref="Customer"/>: bankanın müşterisi (hesap/kredi/kart sahibi).
///  - Personel rolleri: bankada çalışanlar. Personel bankacılık ürünü tutmaz;
///    müşteri adına işlem yapar (şube çalışanı) veya onaylar/denetler (müdürler).
///
/// Banka organizasyon hiyerarşisi (alttan üste):
///   ŞubeÇalışanı → ŞubeMüdürü → İlMüdürü → Direktör
/// Tutar bazlı kredi onayında her bant bir üst kademeye yönlenir.
///
/// <see cref="Admin"/> bankacılık hiyerarşisinin DIŞINDADIR — sadece teknik
/// sistem yöneticisidir (kullanıcı/personel yönetimi, sistem ayarları).
/// </summary>
public enum UserRole
{
    Customer,
    BranchEmployee,
    BranchManager,
    ProvincialManager,
    Director,
    Admin,
}
