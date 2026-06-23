using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Şube müdürü onayı bekleyen yüksek tutarlı havale (fraud önlemi). Belirli bir
/// tutarın üzerindeki havaleler hemen gerçekleşmez; şube çalışanı başlatır,
/// şube müdürü onaylayınca para hareketi yapılır (maker-checker).
/// </summary>
public class PendingTransfer
{
    public Guid Id { get; set; }

    public Guid CustomerUserId { get; set; }   // havalenin sahibi (müşteri)
    public User? Customer { get; set; }

    public Guid FromAccountId { get; set; }
    public string FromIban { get; set; } = string.Empty;
    public string ToIban { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Description { get; set; }

    public TransferStatus Status { get; set; } = TransferStatus.Pending;

    public Guid RequestedByEmployeeId { get; set; } // başlatan şube çalışanı
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Guid? DecidedByUserId { get; set; }      // onaylayan/redden şube müdürü
    public DateTime? DecidedAt { get; set; }
    public string DecisionNote { get; set; } = string.Empty;
}
