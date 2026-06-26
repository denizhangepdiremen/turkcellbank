using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class TransactionRepository : ITransactionRepository
{
    private readonly AppDbContext _db;

    public TransactionRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(Transaction transaction)
    {
        _db.Transactions.Add(transaction);
        // Tek SaveChanges: bu işlem + aynı context'te izlenen hesap bakiyesi
        // değişiklikleri birlikte, atomik olarak kaydedilir.
        await _db.SaveChangesAsync();
    }

    public Task<List<Transaction>> GetByAccountIdAsync(Guid accountId)
        => _db.Transactions
            .Where(t => t.FromAccountId == accountId || t.ToAccountId == accountId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

    public async Task<decimal> SumInternetTransfersAsync(IReadOnlyCollection<Guid> fromAccountIds, DateTime sinceUtc)
    {
        if (fromAccountIds.Count == 0) return 0m;
        return await _db.Transactions
            .Where(t => t.Type == TransactionType.Transfer
                && t.Channel == Channel.Internet
                && t.FromAccountId != null
                && fromAccountIds.Contains(t.FromAccountId.Value)
                && t.CreatedAt >= sinceUtc)
            .SumAsync(t => t.Amount);
    }
}
