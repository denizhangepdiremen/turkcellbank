using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Şube müdürü onayı bekleyen havaleler için veri erişimi.</summary>
public interface IPendingTransferRepository
{
    Task AddAsync(PendingTransfer transfer);
    Task<PendingTransfer?> GetByIdAsync(Guid id);

    // Belirli durumdaki havaleler, müşteri bilgisiyle (onay kuyruğu)
    Task<List<PendingTransfer>> GetByStatusWithCustomerAsync(TransferStatus status);

    Task SaveChangesAsync();
}
