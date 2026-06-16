namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>
/// Şifre hashleme soyutlaması. Gerçek uygulaması (BCrypt) Infrastructure'da.
/// Application "nasıl hashlendiğini" bilmez, sadece bu arayüzü kullanır.
/// </summary>
public interface IPasswordHasher
{
    // Düz şifreyi geri çevrilemez şekilde hashler.
    string Hash(string password);

    // Düz şifre, verilen hash ile eşleşiyor mu? (giriş için — 6b'de kullanılacak)
    bool Verify(string password, string hash);
}
