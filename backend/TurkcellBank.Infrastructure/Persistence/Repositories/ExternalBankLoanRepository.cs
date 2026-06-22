using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class ExternalBankLoanRepository : IExternalBankLoanRepository
{
    private readonly AppDbContext _db;

    public ExternalBankLoanRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<List<ExternalBankLoan>> GetByNationalIdAsync(string nationalId)
        => _db.ExternalBankLoans
            .Where(e => e.NationalId == nationalId)
            .ToListAsync();
}
