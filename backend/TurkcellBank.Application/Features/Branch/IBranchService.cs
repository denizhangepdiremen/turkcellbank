using TurkcellBank.Application.Features.Accounts.Dtos;
using TurkcellBank.Application.Features.Branch.Dtos;
using TurkcellBank.Application.Features.Cards.Dtos;
using TurkcellBank.Application.Features.Loans.Dtos;
using TurkcellBank.Application.Features.Transactions.Dtos;

namespace TurkcellBank.Application.Features.Branch;

/// <summary>
/// Şube çalışanının müşteri ADINA yaptığı işlemler. Mevcut servisleri (hesap/
/// işlem/kredi/kart) işlem bağlamını müşteriye yönlendirerek yeniden kullanır;
/// her kayda Şube kanalı + çalışan damgası yazılır.
/// </summary>
public interface IBranchService
{
    Task<CustomerLookupDto> SearchCustomerAsync(string query);
    Task<AccountDto> OpenAccountAsync(Guid customerId, CreateAccountRequest request);
    Task<TransactionDto> DepositAsync(Guid customerId, DepositRequest request);
    Task<BranchTransferResultDto> TransferAsync(Guid customerId, TransferRequest request);
    Task<CardDto> ApplyCardAsync(Guid customerId, CreateCardRequest request);
    Task<LoanDto> ApplyLoanAsync(Guid customerId, LoanApplicationRequest request);
}
