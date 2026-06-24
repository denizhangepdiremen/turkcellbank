namespace TurkcellBank.Domain.Enums;

/// <summary>Banka kartı durumu (admin onayı gerektirir).</summary>
public enum CardStatus
{
    Pending,   // bekliyor (yetkili onayı bekleniyor)
    Approved,  // onaylı (ödeme yapılabilir)
    Rejected,  // reddedildi
    Blocked,   // bağlı hesap donduruldu — geçici bloke; hesap aktifleşince Approved'a döner
}
