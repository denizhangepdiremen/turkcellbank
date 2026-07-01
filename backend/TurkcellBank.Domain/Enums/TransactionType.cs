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
    TimeDepositOpen,   // vadeli mevduat açılışı (hesaptan çıkış — anapara kilitlenir)
    TimeDepositMaturity, // vadeli mevduat dönüşü (hesaba giriş — anapara + net faiz)
    FxBuy,             // döviz/altın alış (bir bacak TL çıkışı, diğer bacak döviz girişi)
    FxSell,            // döviz/altın satış (bir bacak döviz çıkışı, diğer bacak TL girişi)
    FxConvert,         // döviz/altın çapraz dönüşüm (kaynak birim çıkışı, hedef birim girişi)
    CreditCardPayment, // kredi kartı borcu ödemesi (TL hesaptan çıkış)
    CreditCardCashAdvance, // kredi kartı nakit avansı (TL hesaba giriş)
}
