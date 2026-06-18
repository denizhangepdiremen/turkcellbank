using System.Security.Cryptography;
using System.Text;

namespace TurkcellBank.Application.Features.Payments;

/// <summary>
/// Kart numarası yardımcıları: normalize, maskeleme ve fingerprint (hash).
/// Ham kart numarası asla saklanmaz — maskeli hali gösterilir, fingerprint
/// fraud eşleştirmesi için kullanılır.
/// </summary>
public static class CardHelper
{
    public static string Normalize(string cardNumber)
        => cardNumber.Replace(" ", "").Replace("-", "");

    public static string Mask(string normalized)
    {
        var last4 = normalized.Length >= 4 ? normalized[^4..] : normalized;
        return $"**** **** **** {last4}";
    }

    // SHA-256 hash (hex) — aynı kartı saklamadan eşleştirmek için
    public static string Fingerprint(string normalized)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
        return Convert.ToHexString(bytes);
    }
}
