using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class PaymentRepository : IPaymentRepository
{
    private readonly AppDbContext _db;

    public PaymentRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(Payment payment)
    {
        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();
    }

    // Sadece context'e ekler (kaydetmez) — başka değişikliklerle tek SaveChanges'te yazılır
    public void Add(Payment payment) => _db.Payments.Add(payment);

    public Task<List<Payment>> GetByUserIdAsync(Guid userId)
        => _db.Payments
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

    public Task<Payment?> GetByIdAsync(Guid id)
        => _db.Payments.FirstOrDefaultAsync(p => p.Id == id);

    public Task<List<Payment>> GetAllWithUserAsync()
        => _db.Payments
            .Include(p => p.User)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
}
