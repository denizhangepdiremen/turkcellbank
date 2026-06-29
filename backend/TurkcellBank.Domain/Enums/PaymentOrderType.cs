namespace TurkcellBank.Domain.Enums;

/// <summary>Düzenli ödeme talimatı tipi.</summary>
public enum PaymentOrderType
{
    AutoBill,           // otomatik fatura ödeme (kurum + abone no)
    RecurringTransfer,  // düzenli sabit tutarlı havale (hedef IBAN)
}
