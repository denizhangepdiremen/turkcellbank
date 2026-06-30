using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class FxTradeRepository : IFxTradeRepository
{
    private readonly AppDbContext _db;

    public FxTradeRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddTradeAsync(FxTrade trade, Transaction debitLeg, Transaction creditLeg)
    {
        _db.FxTrades.Add(trade);
        _db.Transactions.Add(debitLeg);
        _db.Transactions.Add(creditLeg);
        // O an izlenen hesap bakiyesi değişiklikleriyle birlikte tek seferde kaydet (atomik).
        await _db.SaveChangesAsync();
    }

    public Task<List<FxTrade>> GetByUserIdAsync(Guid userId)
        => _db.FxTrades
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
}
