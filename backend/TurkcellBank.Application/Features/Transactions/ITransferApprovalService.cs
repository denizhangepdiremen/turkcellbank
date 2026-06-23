using TurkcellBank.Application.Features.Transactions.Dtos;

namespace TurkcellBank.Application.Features.Transactions;

/// <summary>
/// Yüksek tutarlı havale onay akışı (maker-checker). Şube çalışanı bekleyen
/// havale oluşturur; şube müdürü onaylayınca para hareketi yapılır.
/// </summary>
public interface ITransferApprovalService
{
    // Şube çalışanı (impersonate edilmiş bağlamda) bekleyen havale oluşturur.
    Task CreatePendingAsync(TransferRequest request);

    // Şube müdürü onay kuyruğu
    Task<List<PendingTransferDto>> GetPendingAsync();
    Task<TransactionDto> ApproveAsync(Guid id, string? note);
    Task RejectAsync(Guid id, string? note);
}
