namespace TurkcellBank.Application.Features.Transactions.Dtos;

public class TransactionHistoryQuery
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Type { get; set; }
    public string? Direction { get; set; }
    public decimal? MinAmount { get; set; }
    public decimal? MaxAmount { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
