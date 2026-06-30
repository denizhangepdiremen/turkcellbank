namespace TurkcellBank.Application.Features.Transactions.Dtos;

public record TransactionHistoryResult(
    List<TransactionDto> Items,
    int Page,
    int PageSize,
    int TotalCount,
    decimal IncomeTotal,
    decimal ExpenseTotal,
    decimal NetTotal);
