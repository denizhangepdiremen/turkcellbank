using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class FxRateAlertRepository : IFxRateAlertRepository
{
    private readonly AppDbContext _db;

    public FxRateAlertRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(FxRateAlert alert)
    {
        _db.FxRateAlerts.Add(alert);
        await _db.SaveChangesAsync();
    }

    public Task<List<FxRateAlert>> GetByUserIdAsync(Guid userId)
        => _db.FxRateAlerts
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

    public Task<List<FxRateAlert>> GetActiveAsync()
        => _db.FxRateAlerts
            .Where(a => a.IsActive && !a.IsTriggered)
            .OrderBy(a => a.CreatedAt)
            .ToListAsync();

    public Task<FxRateAlert?> GetByIdAsync(Guid id)
        => _db.FxRateAlerts.FirstOrDefaultAsync(a => a.Id == id);

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}
