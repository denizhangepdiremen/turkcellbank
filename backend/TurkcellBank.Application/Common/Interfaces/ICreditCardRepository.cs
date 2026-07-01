using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>
/// Kredi kartı ve alt kayıtlarının (taksit planı, hareket, ekstre) veri erişimi.
/// Kredi kartı bu üç alt kaydın toplandığı bir agregadır; hepsi aynı DbContext'i
/// paylaşır, böylece harcama/ödeme/ekstre kesimi TEK <see cref="SaveChangesAsync"/>
/// ile atomik yazılabilir. <c>Add*</c> metotları kaydetmez; çağıran taraf
/// izlenen değişikliklerle birlikte tek seferde kaydeder.
/// </summary>
public interface ICreditCardRepository
{
    // --- Kart ---
    Task AddCardAsync(CreditCard card); // başvuru (tek başına kaydeder)
    Task<CreditCard?> GetByIdAsync(Guid id);
    Task<List<CreditCard>> GetByUserIdAsync(Guid userId);
    Task<CreditCard?> GetActiveByUserIdAsync(Guid userId); // tek aktif kart kuralı için
    Task<bool> CardNumberExistsAsync(string cardNumber);
    Task<List<CreditCard>> GetAllWithUserAsync();          // admin/onay listesi
    Task<List<CreditCard>> GetDueForStatementAsync(DateTime nowUtc); // worker: kesimi gelenler

    // --- Taksit planı ---
    void AddPlan(CreditCardInstallmentPlan plan);
    Task<List<CreditCardInstallmentPlan>> GetActivePlansAsync(Guid cardId); // faturalanacak taksiti kalanlar
    Task<List<CreditCardInstallmentPlan>> GetPlansAsync(Guid cardId);       // tüm planlar (taksit no/adet çözümü)

    // --- Hareket / ekstre kalemi ---
    void AddTransaction(CreditCardTransaction tx);
    Task<List<CreditCardTransaction>> GetTransactionsAsync(Guid cardId);
    Task<List<CreditCardTransaction>> GetUnbilledStatementItemsAsync(Guid cardId, DateTime statementDate);

    // --- Dönem ekstresi ---
    void AddStatement(CreditCardStatement statement);
    Task<List<CreditCardStatement>> GetStatementsAsync(Guid cardId);
    Task<List<CreditCardStatement>> GetUnpaidStatementsAsync(Guid cardId); // Due/Overdue, eskiden yeniye
    Task<List<CreditCardStatement>> GetInterestBearingStatementsAsync(DateTime nowUtc);

    // --- Limit artış talebi ---
    void AddLimitIncreaseRequest(CreditCardLimitIncreaseRequest request);
    Task<CreditCardLimitIncreaseRequest?> GetLimitIncreaseRequestByIdAsync(Guid id);
    Task<List<CreditCardLimitIncreaseRequest>> GetLimitIncreaseRequestsByCardIdAsync(Guid cardId);
    Task<List<CreditCardLimitIncreaseRequest>> GetPendingLimitIncreaseRequestsAsync();
    Task<bool> HasPendingLimitIncreaseRequestAsync(Guid cardId);

    // --- Ana defter bacağı (borç ödemesinde TL hesap çıkışı) ---
    void AddLedgerTransaction(Transaction tx);

    Task SaveChangesAsync();
}
