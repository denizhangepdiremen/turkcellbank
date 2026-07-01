using TurkcellBank.Application.Features.CreditCards.Dtos;
using TurkcellBank.Application.Features.Payments.Dtos;

namespace TurkcellBank.Application.Features.CreditCards;

/// <summary>
/// Kredi kartı iş mantığı (istek bağlamında — <c>IOperationContext</c>).
/// Başvuru limiti kredi değerlendirme motorundan atanır; harcama Sanal POS'tan
/// çağrılır; borç ödeme TL hesaptan atomik düşülür.
/// </summary>
public interface ICreditCardService
{
    Task<CreditCardDto> ApplyAsync(CreditCardApplicationRequest request);
    Task<List<CreditCardDto>> GetMineAsync();
    Task<List<CreditCardStatementDto>> GetStatementsAsync(Guid cardId);
    Task<List<CreditCardTransactionDto>> GetTransactionsAsync(Guid cardId);
    Task<CreditCardDto> PayAsync(PayCreditCardRequest request);
    Task<CreditCardDto> CashAdvanceAsync(CreditCardCashAdvanceRequest request);
    Task<CreditCardLimitIncreaseDto> RequestLimitIncreaseAsync(CreditCardLimitIncreaseRequestDto request);
    Task<List<CreditCardLimitIncreaseDto>> GetLimitIncreaseRequestsAsync(Guid cardId);
    Task<CreditCardDto> SetOnlineShoppingAsync(Guid cardId, bool enabled);

    /// <summary>Sanal POS'tan kredi kartıyla harcama (taksitli); ödeme kaydını döner.</summary>
    Task<PaymentDto> SpendAsync(CreditCardSpendRequest request);

    // --- Yetkili (admin) onay akışı ---
    Task<List<AdminCreditCardDto>> GetAllForAdminAsync();
    Task<List<AdminCreditCardDto>> GetPendingApprovalAsync();
    Task<CreditCardDto> ApproveAsync(Guid id);
    Task<CreditCardDto> RejectAsync(Guid id);
    Task<CreditCardDto> ApproveLimitIncreaseAsync(Guid id);
    Task<CreditCardLimitIncreaseDto> RejectLimitIncreaseAsync(Guid id);
}
