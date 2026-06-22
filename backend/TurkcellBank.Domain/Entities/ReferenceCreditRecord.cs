using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Referans nüfus kaydı (FAKE veri). Geçmişte kredi almış kişilerin profili.
/// Yapay zeka / kural motoru, başvuranı benzer profillerle karşılaştırıp
/// makul bir maksimum kredi limiti tahmin etmek için bu tabloyu kullanır.
/// Gerçek müşteri verisi DEĞİLDİR; seed ile üretilir.
/// </summary>
public class ReferenceCreditRecord
{
    public Guid Id { get; set; }

    public int Age { get; set; }
    public decimal MonthlyIncome { get; set; }
    public decimal MonthlyExpenses { get; set; }
    public MaritalStatus MaritalStatus { get; set; }
    public int ChildrenCount { get; set; }
    public HousingStatus HousingStatus { get; set; }
    public string Profession { get; set; } = string.Empty;

    public decimal GrantedAmount { get; set; }  // bu kişiye verilen kredi tutarı
    public int TermMonths { get; set; }          // vade
    public bool Defaulted { get; set; }          // geri ödeyemedi mi (temerrüt)
}
