using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Kredi başvurusu. Başvuru anında yapay zeka (veya kural motoru) başvuranı
/// referans nüfusla karşılaştırıp bir maksimum limit hesaplar; diğer bankalardaki
/// ve bizim bankadaki mevcut borçlar düşülerek net limit bulunur ve başvuru
/// otomatik olarak onaylanır/reddedilir. Manuel admin onayı şimdilik devre dışıdır
/// (ileride tutar bazlı onay hiyerarşisi için altyapı korunur).
/// </summary>
public class LoanApplication
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; } // başvuran (admin listesinde gösterilir)

    // --- Başvuru sahibi bilgileri (genişletilmiş form) ---
    public string NationalId { get; set; } = string.Empty; // TC kimlik no
    public int Age { get; set; }
    public MaritalStatus MaritalStatus { get; set; }
    public int ChildrenCount { get; set; }
    public HousingStatus HousingStatus { get; set; }
    public decimal Income { get; set; }            // aylık gelir
    public decimal MonthlyExpenses { get; set; }   // aylık gider
    public int EmploymentMonths { get; set; }      // çalışma kıdemi (ay)
    public string Profession { get; set; } = string.Empty;

    // --- Talep ---
    public decimal Amount { get; set; }       // istenen kredi tutarı
    public int TermMonths { get; set; }       // vade (ay)

    // --- Karar ---
    public LoanStatus Status { get; set; } = LoanStatus.Pending;
    public int Score { get; set; }            // tavsiye amaçlı risk skoru (0-100)

    // --- AI / değerlendirme çıktısı ---
    public decimal MaxLimit { get; set; }     // hesaplanan maksimum kredi limiti
    public decimal ExistingDebt { get; set; } // diğer banka + bizim banka mevcut borç
    public decimal NetLimit { get; set; }     // MaxLimit - ExistingDebt (kullanılabilir)
    public string AiReason { get; set; } = string.Empty; // değerlendirme/analiz metni
    public string DecidedBy { get; set; } = string.Empty; // "AI" / "Şube Müdürü" / "İl Müdürü" / "Direktör"

    // --- Tutar bazlı onay (10M üstü krediler) ---
    // Motorun otomatik kararı (tavsiye). Otomatik kredilerde Status ile aynıdır;
    // onaya düşen kredilerde yetkili bunu görür ve onaylar/ezer (override).
    public LoanStatus RecommendedStatus { get; set; }

    // Bu krediyi onaylaması gereken rol (otomatik kredilerde null).
    public UserRole? RequiredApproverRole { get; set; }

    // Yetkilinin karar notu (müşteriye gösterilir; otomatik kredilerde boş).
    public string DecisionNote { get; set; } = string.Empty;

    // Kararı veren yetkilinin kullanıcı id'si (görev ayrılığı + denetim için).
    public Guid? DecidedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DecidedAt { get; set; }  // karar verildiği an

    // İşlem kanalı + adına başvuruda şube çalışanı (denetim/izlenebilirlik için)
    public Channel Channel { get; set; } = Channel.Internet;
    public Guid? PerformedByEmployeeId { get; set; }
}
