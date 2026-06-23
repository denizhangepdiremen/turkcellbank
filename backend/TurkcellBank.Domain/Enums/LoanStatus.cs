namespace TurkcellBank.Domain.Enums;

/// <summary>Kredi başvuru durumu.</summary>
public enum LoanStatus
{
    Pending,          // bekliyor (eski; yeni akışta kullanılmıyor)
    PendingApproval,  // yetkili (şube/il müdürü/direktör) onayı bekliyor
    Approved,         // onaylandı
    Rejected,         // reddedildi
}
