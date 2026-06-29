using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class BillPaymentRepository : IBillPaymentRepository
{
    private readonly AppDbContext _db;

    public BillPaymentRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(BillPayment payment)
    {
        _db.BillPayments.Add(payment);
        await _db.SaveChangesAsync();
    }

    public Task<List<BillPayment>> GetByUserIdAsync(Guid userId)
        => _db.BillPayments
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

    public Task<List<BillPayment>> GetAllWithUserAsync()
        => _db.BillPayments
            .Include(b => b.User)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

    public Task<bool> IsPaidAsync(string billerCode, string subscriberNo, string period)
        => _db.BillPayments.AnyAsync(b =>
            b.BillerCode == billerCode &&
            b.SubscriberNo == subscriberNo &&
            b.Period == period);
}
