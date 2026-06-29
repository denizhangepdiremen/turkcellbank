using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Bills;

/// <summary>Katalogdaki bir kurum (fatura ödenebilen gerçek kurumlar).</summary>
public record Biller(string Code, string Name, BillCategory Category);

/// <summary>
/// Fatura ödenebilen gerçek kurumların sabit kataloğu. Kurumlar değişmeyen
/// referans veridir; ayrı bir DB tablosu yerine kod içinde tutulur.
///
/// Her kategori için tutar bandı <see cref="AmountRange"/>'te; sorgulanan fatura
/// tutarı (kurum + abone no + dönem) üçlüsünden DETERMİNİSTİK üretilir — aynı
/// abone aynı dönemde her sorguda aynı tutarı görür.
/// </summary>
public static class BillerCatalog
{
    public static readonly IReadOnlyList<Biller> All = new List<Biller>
    {
        // --- Elektrik dağıtım şirketleri ---
        new("BEDAS",        "BEDAŞ (İstanbul Avrupa)",       BillCategory.Elektrik),
        new("AYEDAS",       "AYEDAŞ (İstanbul Anadolu)",     BillCategory.Elektrik),
        new("BASKENT_EDAS", "Başkent EDAŞ (Ankara)",         BillCategory.Elektrik),
        new("GEDIZ",        "Gediz EDAŞ (İzmir/Manisa)",     BillCategory.Elektrik),
        new("MERAM_EDAS",   "Meram EDAŞ (Konya)",            BillCategory.Elektrik),
        new("UEDAS",        "UEDAŞ (Bursa/Güney Marmara)",   BillCategory.Elektrik),

        // --- Su ve kanalizasyon idareleri ---
        new("ISKI",  "İSKİ (İstanbul)", BillCategory.Su),
        new("ASKI",  "ASKİ (Ankara)",   BillCategory.Su),
        new("IZSU",  "İZSU (İzmir)",    BillCategory.Su),
        new("BUSKI", "BUSKİ (Bursa)",   BillCategory.Su),
        new("ASAT",  "ASAT (Antalya)",  BillCategory.Su),

        // --- Doğalgaz dağıtım şirketleri ---
        new("IGDAS",      "İGDAŞ (İstanbul)",       BillCategory.Dogalgaz),
        new("BASKENTGAZ", "Başkentgaz (Ankara)",    BillCategory.Dogalgaz),
        new("IZMIRGAZ",   "İzmirgaz (İzmir)",       BillCategory.Dogalgaz),
        new("BURSAGAZ",   "Bursagaz (Bursa)",       BillCategory.Dogalgaz),

        // --- Telefon / GSM ---
        new("TURKCELL",       "Turkcell",            BillCategory.Telefon),
        new("VODAFONE",       "Vodafone",            BillCategory.Telefon),
        new("TT_MOBIL",       "Türk Telekom Mobil",  BillCategory.Telefon),

        // --- İnternet ---
        new("TTNET",          "Türk Telekom (TTNET)",   BillCategory.Internet),
        new("SUPERONLINE",    "Turkcell Superonline",   BillCategory.Internet),
        new("VODAFONE_NET",   "Vodafone Net",           BillCategory.Internet),
    };

    public static Biller? Find(string code) =>
        All.FirstOrDefault(b => b.Code == code);

    /// <summary>Kategori başına makul aylık fatura tutarı bandı (TL).</summary>
    public static (decimal Min, decimal Max) AmountRange(BillCategory category) => category switch
    {
        BillCategory.Elektrik => (150m, 1200m),
        BillCategory.Su       => (60m, 450m),
        BillCategory.Dogalgaz => (120m, 1500m),
        BillCategory.Telefon  => (90m, 700m),
        BillCategory.Internet => (150m, 600m),
        _ => (100m, 500m),
    };

    /// <summary>İçinde bulunulan ödeme dönemi ("YYYY-MM").</summary>
    public static string CurrentPeriod() => DateTime.UtcNow.ToString("yyyy-MM");

    /// <summary>
    /// (kurum + abone no + dönem) üçlüsünden deterministik fatura tutarı üretir.
    /// Kararlı bir FNV-1a hash kullanılır (string.GetHashCode çalışmalar arası
    /// değişebildiği için tercih edilmez). Sonuç banda ölçeklenip 2 kuruşa yuvarlanır.
    /// </summary>
    public static decimal ComputeAmount(string billerCode, string subscriberNo, string period, BillCategory category)
    {
        var (min, max) = AmountRange(category);
        var key = $"{billerCode}|{subscriberNo}|{period}";

        // FNV-1a 32-bit
        uint hash = 2166136261;
        foreach (var ch in key)
        {
            hash ^= ch;
            hash *= 16777619;
        }

        var fraction = (hash % 10000) / 10000m; // 0.0000 .. 0.9999
        var amount = min + fraction * (max - min);
        return Math.Round(amount, 2);
    }
}
