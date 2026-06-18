using System.Text;

namespace TurkcellBank.Application.Features.Payments;

/// <summary>Kart numarası yardımcıları: rastgele üretim ve maskeleme.</summary>
public static class CardHelper
{
    // 16 haneli rastgele kart numarası üretir
    public static string Generate16Digits()
    {
        var sb = new StringBuilder(16);
        for (var i = 0; i < 16; i++)
            sb.Append(Random.Shared.Next(0, 10));
        return sb.ToString()!;
    }

    // 3 haneli rastgele CVV
    public static string GenerateCvv()
        => Random.Shared.Next(100, 1000).ToString();

    public static string Mask(string cardNumber)
    {
        var last4 = cardNumber.Length >= 4 ? cardNumber[^4..] : cardNumber;
        return $"**** **** **** {last4}";
    }
}
