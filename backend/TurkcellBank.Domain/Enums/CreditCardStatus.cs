namespace TurkcellBank.Domain.Enums;

/// <summary>
/// Kredi kartı başvuru/kart durumu. Debit karttaki <c>CardStatus</c>'tan ayrı
/// tutulur; kredi başvurusu gibi yüksek limit bandı <c>PendingApproval</c> ile
/// yetkili onayına düşebilir.
/// </summary>
public enum CreditCardStatus
{
    Pending,          // oluşturuldu, henüz karara bağlanmadı (nadir; genelde anında karar)
    PendingApproval,  // yüksek limit bandı — yetkili onayı bekliyor
    Approved,         // aktif, harcamaya açık
    Rejected,         // başvuru reddedildi
    Blocked,          // bloke (müşteri/şube tarafından)
}
