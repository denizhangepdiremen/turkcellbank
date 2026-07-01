namespace TurkcellBank.Domain.Enums;

/// <summary>
/// Dönem ekstresi durumu. <c>Overdue</c> (son ödeme tarihi geçti) 2. fazda
/// gecikme faizi ile birlikte devreye girer.
/// </summary>
public enum CreditCardStatementStatus
{
    Open,     // dönem henüz kesilmedi (kullanımda değil — kesim anında Due doğar)
    Due,      // kesildi, ödeme bekliyor
    Paid,     // tamamı ödendi
    Overdue,  // son ödeme tarihi geçti (2. faz)
}
