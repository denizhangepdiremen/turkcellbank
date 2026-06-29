using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class TimeDepositRepository : ITimeDepositRepository
{
    private readonly AppDbContext _db;

    public TimeDepositRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(TimeDeposit deposit)
    {
        _db.TimeDeposits.Add(deposit);
        await _db.SaveChangesAsync();
    }

    public Task<List<TimeDeposit>> GetByUserIdAsync(Guid userId)
        => _db.TimeDeposits
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.OpenedAt)
            .ToListAsync();

    public Task<TimeDeposit?> GetByIdAsync(Guid id)
        => _db.TimeDeposits.FirstOrDefaultAsync(d => d.Id == id);

    public Task<List<TimeDeposit>> GetMaturedActiveAsync(DateTime nowUtc)
        => _db.TimeDeposits
            .Where(d => d.Status == TimeDepositStatus.Active && d.MaturityDate <= nowUtc)
            .OrderBy(d => d.MaturityDate)
            .ToListAsync();

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}
