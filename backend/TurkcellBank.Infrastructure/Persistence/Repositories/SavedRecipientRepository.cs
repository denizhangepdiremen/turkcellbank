using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class SavedRecipientRepository : ISavedRecipientRepository
{
    private readonly AppDbContext _db;

    public SavedRecipientRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(SavedRecipient recipient)
    {
        _db.SavedRecipients.Add(recipient);
        await _db.SaveChangesAsync();
    }

    public Task<List<SavedRecipient>> GetByUserIdAsync(Guid userId)
        => _db.SavedRecipients
            .Where(r => r.UserId == userId)
            .OrderBy(r => r.Name)
            .ThenBy(r => r.CreatedAt)
            .ToListAsync();

    public Task<SavedRecipient?> GetByIdAsync(Guid id)
        => _db.SavedRecipients.FirstOrDefaultAsync(r => r.Id == id);

    public Task<bool> ExistsByUserIdAndIbanAsync(Guid userId, string iban)
        => _db.SavedRecipients.AnyAsync(r => r.UserId == userId && r.Iban == iban);

    public async Task DeleteAsync(SavedRecipient recipient)
    {
        _db.SavedRecipients.Remove(recipient);
        await _db.SaveChangesAsync();
    }
}
