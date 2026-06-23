using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Bir para hareketi kaydı (yatırma veya transfer).
///
/// Tek satır iki hesabı ilgilendirebilir (transfer: gönderen + alıcı).
/// Bir hesabın geçmişi = FromAccountId VEYA ToAccountId o hesap olan kayıtlar.
///
/// IBAN'lar kayda gömülü (denormalize) tutulur — geçmiş gösterimi için
/// ekstra sorgu/join gerekmez (bankacılıkta yaygın "ekstre" yaklaşımı).
/// </summary>
public class Transaction
{
    public Guid Id { get; set; }

    public TransactionType Type { get; set; }

    // Gönderen (deposit'te null)
    public Guid? FromAccountId { get; set; }
    public string? FromIban { get; set; }

    // Alıcı / hedef hesap (deposit'te paranın yattığı hesap)
    public Guid? ToAccountId { get; set; }
    public string? ToIban { get; set; }

    public decimal Amount { get; set; }

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // İşlem kanalı + adına işlemde şube çalışanı (denetim/izlenebilirlik için)
    public Channel Channel { get; set; } = Channel.Internet;
    public Guid? PerformedByEmployeeId { get; set; }
}
