namespace TurkcellBank.Domain.Enums;

/// <summary>Vadeli mevduat durumu.</summary>
public enum TimeDepositStatus
{
    Active,       // vade devam ediyor
    Matured,      // vade doldu, anapara + net faiz hesaba döndü
    ClosedEarly,  // vadesinden önce bozuldu (faiz yok, anapara döndü)
}
