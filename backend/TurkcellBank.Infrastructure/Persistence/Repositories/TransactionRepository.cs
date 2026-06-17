using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;

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
}
