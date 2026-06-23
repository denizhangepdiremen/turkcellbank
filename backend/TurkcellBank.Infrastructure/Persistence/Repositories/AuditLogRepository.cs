using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly AppDbContext _db;

    public AuditLogRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(AuditLog log)
    {
        _db.AuditLogs.Add(log);
        await _db.SaveChangesAsync();
    }

    public Task<List<AuditLog>> GetRecentAsync(int take)
        => _db.AuditLogs
            .Include(a => a.Actor)
            .OrderByDescending(a => a.CreatedAt)
            .Take(take)
            .ToListAsync();
}
