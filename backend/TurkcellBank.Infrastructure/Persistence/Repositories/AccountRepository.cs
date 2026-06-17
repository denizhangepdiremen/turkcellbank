using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

/// <summary>IAccountRepository'nin EF Core ile gerçek uygulaması.</summary>
public class AccountRepository : IAccountRepository
{
    private readonly AppDbContext _db;

    public AccountRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(Account account)
    {
        _db.Accounts.Add(account);
        await _db.SaveChangesAsync();
    }

    public Task<List<Account>> GetByUserIdAsync(Guid userId)
        => _db.Accounts
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

    public Task<Account?> GetByIdAsync(Guid id)
        => _db.Accounts.FirstOrDefaultAsync(a => a.Id == id);

    public Task<Account?> GetByIbanAsync(string iban)
        => _db.Accounts.FirstOrDefaultAsync(a => a.Iban == iban);

    public Task<bool> IbanExistsAsync(string iban)
        => _db.Accounts.AnyAsync(a => a.Iban == iban);

    public Task SaveChangesAsync()
        => _db.SaveChangesAsync();
}
