namespace TurkcellBank.Domain.Enums;

/// <summary>Banka kartı durumu (admin onayı gerektirir).</summary>
public enum CardStatus
{
    Pending,   // bekliyor (admin onayı bekleniyor)
    Approved,  // onaylı (ödeme yapılabilir)
    Rejected,  // reddedildi
}
