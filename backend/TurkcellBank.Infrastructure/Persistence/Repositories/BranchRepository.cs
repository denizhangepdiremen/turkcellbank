using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class BranchRepository : IBranchRepository
{
    private readonly AppDbContext _db;

    public BranchRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<List<Branch>> GetAllAsync()
        => _db.Branches.OrderBy(b => b.City).ThenBy(b => b.Name).ToListAsync();
}
