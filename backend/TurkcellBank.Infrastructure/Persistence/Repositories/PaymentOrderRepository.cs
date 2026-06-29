using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class PaymentOrderRepository : IPaymentOrderRepository
{
    private readonly AppDbContext _db;

    public PaymentOrderRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(PaymentOrder order)
    {
        _db.PaymentOrders.Add(order);
        await _db.SaveChangesAsync();
    }

    public Task<List<PaymentOrder>> GetByUserIdAsync(Guid userId)
        => _db.PaymentOrders
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

    public Task<PaymentOrder?> GetByIdAsync(Guid id)
        => _db.PaymentOrders.FirstOrDefaultAsync(o => o.Id == id);

    public Task<List<PaymentOrder>> GetDueAsync(DateTime nowUtc)
        => _db.PaymentOrders
            .Where(o => o.IsActive && o.NextRunDate <= nowUtc)
            .OrderBy(o => o.NextRunDate)
            .ToListAsync();

    public async Task DeleteAsync(PaymentOrder order)
    {
        _db.PaymentOrders.Remove(order);
        await _db.SaveChangesAsync();
    }

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}
