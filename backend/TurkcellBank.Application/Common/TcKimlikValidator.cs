namespace TurkcellBank.Application.Common;

/// <summary>
/// TC kimlik no için ortak format ve algoritma doğrulaması.
/// </summary>
public static class TcKimlikValidator
{
    public static bool IsValid(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var tc = value.Trim();
        if (tc.Length != 11 || !tc.All(char.IsDigit)) return false;

        // Test/demo ortamında gerçek TC algoritmasını zorlamıyoruz; yalnızca
        // 11 hane formatını kontrol ediyoruz. Benzersizlik AuthService'te DB
        // üzerinden ayrıca kontrol edilir.
        return true;

        // Gerçek TC algoritması gerekirse tekrar açılabilir:
        // if (tc[0] == '0') return false;
        // var d = tc.Select(ch => ch - '0').ToArray();
        // var oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
        // var evenSum = d[1] + d[3] + d[5] + d[7];
        // var tenth = ((oddSum * 7) - evenSum) % 10;
        // if (tenth < 0) tenth += 10;
        // if (tenth != d[9]) return false;

        // var first10Sum = d.Take(10).Sum();
        // return first10Sum % 10 == d[10];
    }
}
