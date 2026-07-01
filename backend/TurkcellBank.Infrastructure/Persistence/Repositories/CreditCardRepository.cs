using Microsoft.EntityFrameworkCore;
using Npgsql;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

/// <summary>
/// Kredi kartı agregası (kart + taksit planı + hareket + ekstre) veri erişimi.
/// Tüm alt kayıtlar aynı DbContext'i paylaşır; <c>Add*</c> metotları kaydetmez,
/// çağıran taraf <see cref="SaveChangesAsync"/> ile atomik yazar.
/// </summary>
public class CreditCardRepository : ICreditCardRepository
{
    private readonly AppDbContext _db;

    public CreditCardRepository(AppDbContext db)
    {
        _db = db;
    }

    // --- Kart ---
    public async Task AddCardAsync(CreditCard card)
    {
        _db.CreditCards.Add(card);
        await _db.SaveChangesAsync();
    }

    public Task<CreditCard?> GetByIdAsync(Guid id)
        => _db.CreditCards.FirstOrDefaultAsync(c => c.Id == id);

    public Task<List<CreditCard>> GetByUserIdAsync(Guid userId)
        => _db.CreditCards
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.OpenedAt)
            .ToListAsync();

    public Task<CreditCard?> GetActiveByUserIdAsync(Guid userId)
        => _db.CreditCards
            .Where(c => c.UserId == userId
                && (c.Status == CreditCardStatus.Approved
                    || c.Status == CreditCardStatus.PendingApproval
                    || c.Status == CreditCardStatus.Pending
                    || c.Status == CreditCardStatus.Blocked))
            .FirstOrDefaultAsync();

    public Task<bool> CardNumberExistsAsync(string cardNumber)
        => _db.CreditCards.AnyAsync(c => c.CardNumber == cardNumber);

    public Task<List<CreditCard>> GetAllWithUserAsync()
        => _db.CreditCards
            .Include(c => c.User)
            .OrderByDescending(c => c.OpenedAt)
            .ToListAsync();

    public Task<List<CreditCard>> GetDueForStatementAsync(DateTime nowUtc)
        => _db.CreditCards
            .Where(c => c.Status == CreditCardStatus.Approved && c.NextStatementDate <= nowUtc)
            .OrderBy(c => c.NextStatementDate)
            .ToListAsync();

    // --- Taksit planı ---
    public void AddPlan(CreditCardInstallmentPlan plan) => _db.CreditCardInstallmentPlans.Add(plan);

    public Task<List<CreditCardInstallmentPlan>> GetActivePlansAsync(Guid cardId)
        => _db.CreditCardInstallmentPlans
            .Where(p => p.CreditCardId == cardId && p.InstallmentsBilled < p.InstallmentCount)
            .OrderBy(p => p.CreatedAt)
            .ToListAsync();

    public Task<List<CreditCardInstallmentPlan>> GetPlansAsync(Guid cardId)
        => _db.CreditCardInstallmentPlans
            .Where(p => p.CreditCardId == cardId)
            .ToListAsync();

    // --- Hareket / ekstre kalemi ---
    public void AddTransaction(CreditCardTransaction tx) => _db.CreditCardTransactions.Add(tx);

    public Task<List<CreditCardTransaction>> GetTransactionsAsync(Guid cardId)
        => _db.CreditCardTransactions
            .Where(t => t.CreditCardId == cardId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

    public Task<List<CreditCardTransaction>> GetUnbilledStatementItemsAsync(Guid cardId, DateTime statementDate)
        => _db.CreditCardTransactions
            .Where(t => t.CreditCardId == cardId
                && t.StatementId == null
                && t.CreatedAt < statementDate
                && (t.Type == CreditCardTxType.CashAdvance
                    || t.Type == CreditCardTxType.Fee
                    || t.Type == CreditCardTxType.Interest
                    || t.Type == CreditCardTxType.Refund))
            .OrderBy(t => t.CreatedAt)
            .ToListAsync();

    // --- Dönem ekstresi ---
    public void AddStatement(CreditCardStatement statement) => _db.CreditCardStatements.Add(statement);

    public Task<List<CreditCardStatement>> GetStatementsAsync(Guid cardId)
        => _db.CreditCardStatements
            .Where(s => s.CreditCardId == cardId)
            .OrderByDescending(s => s.StatementDate)
            .ToListAsync();

    public Task<List<CreditCardStatement>> GetUnpaidStatementsAsync(Guid cardId)
        => _db.CreditCardStatements
            .Where(s => s.CreditCardId == cardId
                && (s.Status == CreditCardStatementStatus.Due
                    || s.Status == CreditCardStatementStatus.Overdue))
            .OrderBy(s => s.StatementDate) // eskiden yeniye
            .ToListAsync();

    public Task<List<CreditCardStatement>> GetInterestBearingStatementsAsync(DateTime nowUtc)
        => _db.CreditCardStatements
            .Include(s => s.CreditCard)
            .Where(s => s.RemainingAmount > 0m
                && s.DueDate < nowUtc
                && (s.Status == CreditCardStatementStatus.Due
                    || s.Status == CreditCardStatementStatus.Overdue))
            .OrderBy(s => s.DueDate)
            .ToListAsync();

    // --- Limit artış talebi ---
    public void AddLimitIncreaseRequest(CreditCardLimitIncreaseRequest request)
        => _db.CreditCardLimitIncreaseRequests.Add(request);

    public Task<CreditCardLimitIncreaseRequest?> GetLimitIncreaseRequestByIdAsync(Guid id)
        => _db.CreditCardLimitIncreaseRequests
            .Include(r => r.CreditCard)
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id);

    public async Task<List<CreditCardLimitIncreaseRequest>> GetLimitIncreaseRequestsByCardIdAsync(Guid cardId)
    {
        try
        {
            return await _db.CreditCardLimitIncreaseRequests
                .Where(r => r.CreditCardId == cardId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }
        catch (PostgresException ex) when (IsMissingTable(ex))
        {
            return new List<CreditCardLimitIncreaseRequest>();
        }
    }

    public async Task<List<CreditCardLimitIncreaseRequest>> GetPendingLimitIncreaseRequestsAsync()
    {
        try
        {
            return await _db.CreditCardLimitIncreaseRequests
                .Include(r => r.CreditCard)
                .Include(r => r.User)
                .Where(r => r.Status == CreditCardLimitRequestStatus.PendingApproval)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }
        catch (PostgresException ex) when (IsMissingTable(ex))
        {
            return new List<CreditCardLimitIncreaseRequest>();
        }
    }

    public async Task<bool> HasPendingLimitIncreaseRequestAsync(Guid cardId)
    {
        try
        {
            return await _db.CreditCardLimitIncreaseRequests
                .AnyAsync(r => r.CreditCardId == cardId
                    && (r.Status == CreditCardLimitRequestStatus.Pending
                        || r.Status == CreditCardLimitRequestStatus.PendingApproval));
        }
        catch (PostgresException ex) when (IsMissingTable(ex))
        {
            return false;
        }
    }

    // --- Ana defter bacağı ---
    public void AddLedgerTransaction(Transaction tx) => _db.Transactions.Add(tx);

    public Task SaveChangesAsync() => _db.SaveChangesAsync();

    private static bool IsMissingTable(PostgresException ex)
        => ex.SqlState == PostgresErrorCodes.UndefinedTable;
}
