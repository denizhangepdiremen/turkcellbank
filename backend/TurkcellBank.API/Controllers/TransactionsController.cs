using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Transactions;
using TurkcellBank.Application.Features.Transactions.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>
/// Para hareketleri: yatırma, transfer, geçmiş. Tümü [Authorize].
/// </summary>
[ApiController]
[Route("api/transactions")]
[Authorize]
public class TransactionsController : ControllerBase
{
    private readonly ITransactionService _transactionService;

    public TransactionsController(ITransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    /// <summary>Hesaba para yatır. POST /api/transactions/deposit</summary>
    [HttpPost("deposit")]
    public async Task<IActionResult> Deposit(DepositRequest request)
    {
        var result = await _transactionService.DepositAsync(request);
        return Ok(ApiResponse<TransactionDto>.SuccessResponse(result, "Para yatırıldı."));
    }

    /// <summary>Banka içi transfer. POST /api/transactions/transfer</summary>
    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer(TransferRequest request)
    {
        var result = await _transactionService.TransferAsync(request);
        return Ok(ApiResponse<TransactionDto>.SuccessResponse(result, "Transfer başarılı."));
    }

    /// <summary>Bir hesabın işlem geçmişi. GET /api/transactions/{accountId}</summary>
    [HttpGet("{accountId:guid}")]
    public async Task<IActionResult> History(Guid accountId)
    {
        var result = await _transactionService.GetHistoryAsync(accountId);
        return Ok(ApiResponse<List<TransactionDto>>.SuccessResponse(result));
    }
}
