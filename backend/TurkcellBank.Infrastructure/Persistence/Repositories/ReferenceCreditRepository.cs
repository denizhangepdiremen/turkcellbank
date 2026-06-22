using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class ReferenceCreditRepository : IReferenceCreditRepository
{
    private readonly AppDbContext _db;

    public ReferenceCreditRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<List<ReferenceCreditRecord>> GetSimilarByIncomeAsync(decimal income, int maxCount)
    {
        // Gelir bandına yakın (±%40) kayıtlar, gelire en yakından uzağa
        var low = income * 0.6m;
        var high = income * 1.4m;

        return _db.ReferenceCreditRecords
            .Where(r => r.MonthlyIncome >= low && r.MonthlyIncome <= high)
            .OrderBy(r => Math.Abs(r.MonthlyIncome - income))
            .Take(maxCount)
            .ToListAsync();
    }
}
