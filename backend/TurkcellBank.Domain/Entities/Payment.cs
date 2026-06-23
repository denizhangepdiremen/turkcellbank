using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Sanal POS ödeme kaydı. Ödeme, kullanıcının onaylı banka kartıyla yapılır
/// ve tutar karta bağlı hesaptan düşülür.
/// </summary>
public class Payment
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; } // ödeyen (admin listesinde gösterilir)

    public Guid? CardId { get; set; }     // kullanılan kart
    public Guid? AccountId { get; set; }  // parası çekilen/iade edilen hesap

    public string MaskedCardNumber { get; set; } = string.Empty; // **** **** **** 3456

    public decimal Amount { get; set; }
    public PaymentStatus Status { get; set; }
    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // İşlem kanalı + adına işlemde şube çalışanı (denetim/izlenebilirlik için)
    public Channel Channel { get; set; } = Channel.Internet;
    public Guid? PerformedByEmployeeId { get; set; }
}
