namespace TurkcellBank.Domain.Enums;

/// <summary>İşlem tipi: para yatırma veya transfer (banka içi havale).</summary>
public enum TransactionType
{
    Deposit,   // para yatırma
    Transfer,  // hesaplar arası transfer
}
