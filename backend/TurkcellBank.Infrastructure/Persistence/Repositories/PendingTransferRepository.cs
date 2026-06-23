using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class PendingTransferRepository : IPendingTransferRepository
{
    private readonly AppDbContext _db;

    public PendingTransferRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(PendingTransfer transfer)
    {
        _db.PendingTransfers.Add(transfer);
        await _db.SaveChangesAsync();
    }

    public Task<PendingTransfer?> GetByIdAsync(Guid id)
        => _db.PendingTransfers.FirstOrDefaultAsync(t => t.Id == id);

    public Task<List<PendingTransfer>> GetByStatusWithCustomerAsync(TransferStatus status)
        => _db.PendingTransfers
            .Include(t => t.Customer)
            .Where(t => t.Status == status)
            .OrderBy(t => t.CreatedAt) // en eski önce (kuyruk)
            .ToListAsync();

    public Task SaveChangesAsync()
        => _db.SaveChangesAsync();
}
