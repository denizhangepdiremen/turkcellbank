using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class LoanRepository : ILoanRepository
{
    private readonly AppDbContext _db;

    public LoanRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(LoanApplication loan)
    {
        _db.LoanApplications.Add(loan);
        await _db.SaveChangesAsync();
    }

    public Task<List<LoanApplication>> GetByUserIdAsync(Guid userId)
        => _db.LoanApplications
            .Where(l => l.UserId == userId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

    public Task<LoanApplication?> GetByIdAsync(Guid id)
        => _db.LoanApplications.FirstOrDefaultAsync(l => l.Id == id);

    public Task<List<LoanApplication>> GetAllWithUserAsync()
        => _db.LoanApplications
            .Include(l => l.User) // başvuran bilgisi (admin listesi)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

    public Task<List<LoanApplication>> GetByStatusWithUserAsync(LoanStatus status)
        => _db.LoanApplications
            .Include(l => l.User)
            .Where(l => l.Status == status)
            .OrderBy(l => l.CreatedAt) // en eski başvuru önce (kuyruk mantığı)
            .ToListAsync();

    public Task SaveChangesAsync()
        => _db.SaveChangesAsync();
}
