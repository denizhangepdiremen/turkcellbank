namespace TurkcellBank.Domain.Enums;

/// <summary>İşlem tipi.</summary>
public enum TransactionType
{
    Deposit,           // para yatırma
    Transfer,          // hesaplar arası transfer
    Payment,           // sanal POS ödemesi (hesaptan çıkış)
    Refund,            // ödeme iadesi (hesaba giriş)
    LoanDisbursement,  // kredi kullandırımı (hesaba giriş)
    LoanRepayment,     // kredi taksiti ödemesi (hesaptan çıkış)
    BillPayment,       // fatura ödemesi (hesaptan çıkış)
}
