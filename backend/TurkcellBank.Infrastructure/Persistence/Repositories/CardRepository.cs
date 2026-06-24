using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class CardRepository : ICardRepository
{
    private readonly AppDbContext _db;

    public CardRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(Card card)
    {
        _db.Cards.Add(card);
        await _db.SaveChangesAsync();
    }

    public Task<List<Card>> GetByUserIdAsync(Guid userId)
        => _db.Cards
            .Include(c => c.Account)
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

    public Task<Card?> GetByIdAsync(Guid id)
        => _db.Cards
            .Include(c => c.Account)
            .FirstOrDefaultAsync(c => c.Id == id);

    public Task<bool> CardNumberExistsAsync(string cardNumber)
        => _db.Cards.AnyAsync(c => c.CardNumber == cardNumber);

    public Task<List<Card>> GetAllWithUserAsync()
        => _db.Cards
            .Include(c => c.User)
            .Include(c => c.Account)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

    public Task<List<Card>> GetByAccountIdAsync(Guid accountId)
        => _db.Cards
            .Where(c => c.AccountId == accountId)
            .ToListAsync();

    public void RemoveRange(IEnumerable<Card> cards)
        => _db.Cards.RemoveRange(cards);

    public Task SaveChangesAsync()
        => _db.SaveChangesAsync();
}
