using TurkcellBank.Application.Features.Loans.Dtos;

namespace TurkcellBank.Application.Features.Loans;

public interface ILoanService
{
    // --- Müşteri ---
    Task<LoanDto> ApplyAsync(LoanApplicationRequest request);
    Task<List<LoanDto>> GetMyLoansAsync();
    Task<LoanDto> GetMyLoanDetailAsync(Guid id); // onaylıysa ödeme planıyla

    // --- Admin ---
    Task<List<AdminLoanDto>> GetAllLoansAsync();
    Task<LoanDto> ApproveAsync(Guid id);
    Task<LoanDto> RejectAsync(Guid id);
}
