using System.Text;

namespace TurkcellBank.Application.Common;

/// <summary>
/// Geçerli (mod-97 kontrol haneli) Türkiye IBAN'ı üretir — ISO 13616 standardı.
///
/// TR IBAN yapısı (26 karakter, boşluksuz):
///   TR | 2 kontrol hanesi | 5 banka kodu | 1 rezerv | 16 hesap no
///
/// Kontrol haneleri mod-97 ile hesaplanır; böylece üretilen IBAN
/// gerçek doğrulama testlerinden geçer.
/// </summary>
public static class IbanGenerator
{
    private const string CountryCode = "TR";
    private const string BankCode = "00099"; // TurkcellBank için örnek 5 haneli banka kodu

    public static string Generate()
    {
        // BBAN = banka kodu(5) + rezerv(1) + hesap no(16) = 22 hane
        var bban = BankCode + "0" + RandomDigits(16);

        var checkDigits = ComputeCheckDigits(bban);
        return CountryCode + checkDigits + bban; // toplam 26 karakter
    }

    private static string RandomDigits(int length)
    {
        var sb = new StringBuilder(length);
        for (var i = 0; i < length; i++)
            sb.Append(Random.Shared.Next(0, 10));
        return sb.ToString();
    }

    /// <summary>
    /// ISO 13616 kontrol hanesi hesabı:
    /// 1) BBAN'ın sonuna ülke kodu (harfler sayıya çevrilir: T=29, R=27) + "00" eklenir.
    /// 2) Bu büyük sayının mod 97'si alınır.
    /// 3) Kontrol hanesi = 98 - kalan (iki haneli).
    /// </summary>
    private static string ComputeCheckDigits(string bban)
    {
        // T -> 29, R -> 27  (A=10 ... Z=35)
        const string trAsDigits = "2927";
        var rearranged = bban + trAsDigits + "00";

        var remainder = Mod97(rearranged);
        var check = 98 - remainder;
        return check.ToString("D2"); // her zaman 2 haneli
    }

    // Çok büyük sayıyı parça parça işleyerek mod 97 hesaplar (taşma olmadan)
    private static int Mod97(string digits)
    {
        var remainder = 0;
        foreach (var c in digits)
            remainder = (remainder * 10 + (c - '0')) % 97;
        return remainder;
    }
}
