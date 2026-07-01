namespace TurkcellBank.Domain.Enums;

/// <summary>
/// Kredi kartı hareketi/ekstre kalemi tipi. Fee/Interest/CashAdvance 2. faz
/// (bu MVP'de üretilmez, yalnızca tip olarak ayrılmıştır).
/// </summary>
public enum CreditCardTxType
{
    Purchase,     // peşin alışveriş (tek kalem, tam tutar ekstreye)
    Installment,  // taksitli alışverişin bir dönem taksiti
    Payment,      // borç ödemesi (kart borcunu azaltır)
    Refund,       // iade (borcu azaltır)
    Fee,          // ücret/komisyon (2. faz)
    Interest,     // akdi/gecikme faizi (2. faz)
    CashAdvance,  // nakit avans (2. faz)
}
