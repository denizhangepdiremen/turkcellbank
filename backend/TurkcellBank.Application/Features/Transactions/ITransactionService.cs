using TurkcellBank.Application.Features.Transactions.Dtos;

namespace TurkcellBank.Application.Features.Transactions;

public interface ITransactionService
{
    Task<TransactionDto> DepositAsync(DepositRequest request);
    Task<TransactionDto> TransferAsync(TransferRequest request);
    Task<List<TransactionDto>> GetHistoryAsync(Guid accountId);
    Task<TransactionHistoryResult> SearchHistoryAsync(Guid accountId, TransactionHistoryQuery query);
}
