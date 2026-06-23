namespace TurkcellBank.Domain.Enums;

/// <summary>Yüksek tutarlı (şube müdürü onayı gereken) havale durumu.</summary>
public enum TransferStatus
{
    Pending,   // şube müdürü onayı bekliyor
    Approved,  // onaylandı ve gerçekleştirildi
    Rejected,  // reddedildi
}
