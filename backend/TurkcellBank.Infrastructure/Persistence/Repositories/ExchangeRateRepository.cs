using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class ExchangeRateRepository : IExchangeRateRepository
{
    private readonly AppDbContext _db;

    public ExchangeRateRepository(AppDbContext db)
    {
        _db = db;
    }

    // İzlenen (tracked) — jitter servisi üzerinde değişiklik yapıp SaveChanges çağırır.
    public Task<List<ExchangeRate>> GetAllAsync()
        => _db.ExchangeRates.OrderBy(r => r.Currency).ToListAsync();

    public Task<ExchangeRate?> GetByCurrencyAsync(Currency currency)
        => _db.ExchangeRates.FirstOrDefaultAsync(r => r.Currency == currency);

    public async Task AddAsync(ExchangeRate rate)
    {
        _db.ExchangeRates.Add(rate);
        await _db.SaveChangesAsync();
    }

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}
