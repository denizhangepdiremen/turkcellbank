using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Accounts.Dtos;
using TurkcellBank.Application.Features.Branch;
using TurkcellBank.Application.Features.Branch.Dtos;
using TurkcellBank.Application.Features.Cards.Dtos;
using TurkcellBank.Application.Features.Loans.Dtos;
using TurkcellBank.Application.Features.Transactions.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>
/// Şube çalışanı işlemleri: masaya gelen müşteri ADINA işlem yapma.
/// Sadece ŞubeÇalışanı rolü erişebilir. Tüm kayıtlar Şube kanalı + çalışan
/// damgasıyla yazılır.
/// </summary>
[ApiController]
[Route("api/branch")]
[Authorize(Roles = "BranchEmployee")]
public class BranchController : ControllerBase
{
    private readonly IBranchService _branch;

    public BranchController(IBranchService branch)
    {
        _branch = branch;
    }

    /// <summary>Müşteri ara (TC kimlik no veya e-posta). GET /api/branch/customers?query=...</summary>
    [HttpGet("customers")]
    public async Task<IActionResult> SearchCustomer([FromQuery] string query)
    {
        var customer = await _branch.SearchCustomerAsync(query);
        return Ok(ApiResponse<CustomerLookupDto>.SuccessResponse(customer));
    }

    /// <summary>Müşteri adına hesap aç. POST /api/branch/customers/{customerId}/accounts</summary>
    [HttpPost("customers/{customerId:guid}/accounts")]
    public async Task<IActionResult> OpenAccount(Guid customerId, CreateAccountRequest request)
    {
        var account = await _branch.OpenAccountAsync(customerId, request);
        return Ok(ApiResponse<AccountDto>.SuccessResponse(account, "Hesap açıldı."));
    }

    /// <summary>Müşteri adına para yatır. POST /api/branch/customers/{customerId}/deposit</summary>
    [HttpPost("customers/{customerId:guid}/deposit")]
    public async Task<IActionResult> Deposit(Guid customerId, DepositRequest request)
    {
        var tx = await _branch.DepositAsync(customerId, request);
        return Ok(ApiResponse<TransactionDto>.SuccessResponse(tx, "Para yatırıldı."));
    }

    /// <summary>Müşteri adına havale yap. POST /api/branch/customers/{customerId}/transfer</summary>
    [HttpPost("customers/{customerId:guid}/transfer")]
    public async Task<IActionResult> Transfer(Guid customerId, TransferRequest request)
    {
        var tx = await _branch.TransferAsync(customerId, request);
        return Ok(ApiResponse<TransactionDto>.SuccessResponse(tx, "Transfer tamamlandı."));
    }

    /// <summary>Müşteri adına kart başvurusu. POST /api/branch/customers/{customerId}/cards</summary>
    [HttpPost("customers/{customerId:guid}/cards")]
    public async Task<IActionResult> ApplyCard(Guid customerId, CreateCardRequest request)
    {
        var card = await _branch.ApplyCardAsync(customerId, request);
        return Ok(ApiResponse<CardDto>.SuccessResponse(card, "Kart başvurusu alındı."));
    }

    /// <summary>Müşteri adına kredi başvurusu. POST /api/branch/customers/{customerId}/loans</summary>
    [HttpPost("customers/{customerId:guid}/loans")]
    public async Task<IActionResult> ApplyLoan(Guid customerId, LoanApplicationRequest request)
    {
        var loan = await _branch.ApplyLoanAsync(customerId, request);
        return Ok(ApiResponse<LoanDto>.SuccessResponse(loan, "Kredi başvurusu alındı."));
    }
}
