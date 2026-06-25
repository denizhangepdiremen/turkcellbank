using TurkcellBank.Application.Features.Loans.Dtos;

namespace TurkcellBank.Application.Features.Loans;

public interface ILoanService
{
    // --- Müşteri ---
    Task<LoanDto> ApplyAsync(LoanApplicationRequest request);
    Task<List<LoanDto>> GetMyLoansAsync();
    Task<LoanDto> GetMyLoanDetailAsync(Guid id); // onaylıysa ödeme planıyla
    Task<LoanDto> PayInstallmentAsync(Guid loanId, Guid accountId); // taksiti seçilen hesaptan öde

    // --- Admin (teknik, salt-okunur) ---
    Task<List<AdminLoanDto>> GetAllLoansAsync();

    // --- Yetkili onay (şube/il müdürü/direktör) ---
    Task<List<PendingLoanDto>> GetPendingApprovalsAsync();
    Task<List<LoanHistoryDto>> GetDecidedAsync(); // kendi bandımda karara bağlananlar
    Task<LoanDto> ApproveAsync(Guid id, string? note);
    Task<LoanDto> RejectAsync(Guid id, string? note);
}
