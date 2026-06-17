namespace TurkcellBank.Domain.Enums;

/// <summary>Kredi başvuru durumu.</summary>
public enum LoanStatus
{
    Pending,   // bekliyor (admin kararı bekleniyor)
    Approved,  // onaylandı
    Rejected,  // reddedildi
}
