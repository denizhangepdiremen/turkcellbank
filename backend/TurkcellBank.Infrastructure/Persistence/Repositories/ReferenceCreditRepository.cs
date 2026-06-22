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

    public Task<List<ReferenceCreditRecord>> GetCandidatesByIncomeAsync(decimal income, int poolSize)
    {
        // Gelir bandı ±%50 (geniş aday havuzu); index'li MonthlyIncome ile hızlı.
        // Çok-faktörlü nihai sıralama Application katmanındaki PeerMatcher'da yapılır.
        var low = income * 0.5m;
        var high = income * 1.5m;

        return _db.ReferenceCreditRecords
            .Where(r => r.MonthlyIncome >= low && r.MonthlyIncome <= high)
            .OrderBy(r => Math.Abs(r.MonthlyIncome - income))
            .Take(poolSize)
            .ToListAsync();
    }
}
