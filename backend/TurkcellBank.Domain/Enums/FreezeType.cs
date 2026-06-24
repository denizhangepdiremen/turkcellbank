namespace TurkcellBank.Domain.Enums;

/// <summary>
/// Hesap dondurma kaynağı. Müşterinin kendi dondurması (Customer) müşteri
/// tarafından geri açılabilir; bankanın koyduğu blok (Bank) yalnızca personel
/// (şube/il müdürü vb.) tarafından kaldırılabilir.
/// </summary>
public enum FreezeType
{
    None,      // dondurulmamış
    Customer,  // müşteri kendi dondurdu (kendi açabilir)
    Bank,      // banka dondurdu (müşteri açamaz, personel açar)
}
