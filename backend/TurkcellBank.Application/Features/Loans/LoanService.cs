using FluentValidation;
using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Loans.Dtos;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Loans;

public class LoanService : ILoanService
{
    private readonly ILoanRepository _loans;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<LoanApplicationRequest> _validator;

    public LoanService(
        ILoanRepository loans,
        ICurrentUserService currentUser,
        IValidator<LoanApplicationRequest> validator)
    {
        _loans = loans;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<LoanDto> ApplyAsync(LoanApplicationRequest request)
    {
        var validation = await _validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new Common.Exceptions.ValidationException(
                validation.Errors.Select(e => e.ErrorMessage).ToList());

        var loan = new LoanApplication
        {
            Id = Guid.NewGuid(),
            UserId = _currentUser.UserId,
            Income = request.Income,
            Profession = request.Profession.Trim(),
            Amount = request.Amount,
            TermMonths = request.TermMonths,
            Status = LoanStatus.Pending, // admin karar verecek
            Score = LoanScoring.Calculate(request.Income, request.Amount, request.TermMonths),
            CreatedAt = DateTime.UtcNow,
        };

        await _loans.AddAsync(loan);
        return MapLoan(loan, includePlan: false);
    }

    public async Task<List<LoanDto>> GetMyLoansAsync()
    {
        var loans = await _loans.GetByUserIdAsync(_currentUser.UserId);
        return loans.Select(l => MapLoan(l, includePlan: false)).ToList();
    }

    public async Task<LoanDto> GetMyLoanDetailAsync(Guid id)
    {
        var loan = await _loans.GetByIdAsync(id);
        if (loan is null || loan.UserId != _currentUser.UserId)
            throw new NotFoundException("Kredi başvurusu bulunamadı.");

        // Onaylıysa ödeme planını da ekle
        return MapLoan(loan, includePlan: loan.Status == LoanStatus.Approved);
    }

    public async Task<List<AdminLoanDto>> GetAllLoansAsync()
    {
        var loans = await _loans.GetAllWithUserAsync();
        return loans.Select(l => new AdminLoanDto(
            l.Id,
            l.User?.FullName ?? "—",
            l.User?.Email ?? "—",
            l.Income,
            l.Profession,
            l.Amount,
            l.TermMonths,
            l.Status.ToString(),
            l.Score,
            l.CreatedAt,
            l.DecidedAt)).ToList();
    }

    public Task<LoanDto> ApproveAsync(Guid id) => DecideAsync(id, LoanStatus.Approved);
    public Task<LoanDto> RejectAsync(Guid id) => DecideAsync(id, LoanStatus.Rejected);

    private async Task<LoanDto> DecideAsync(Guid id, LoanStatus decision)
    {
        var loan = await _loans.GetByIdAsync(id)
            ?? throw new NotFoundException("Kredi başvurusu bulunamadı.");

        if (loan.Status != LoanStatus.Pending)
            throw new BusinessException("Bu başvuru zaten karara bağlanmış.");

        loan.Status = decision;
        loan.DecidedAt = DateTime.UtcNow;
        await _loans.SaveChangesAsync();

        return MapLoan(loan, includePlan: decision == LoanStatus.Approved);
    }

    // Entity -> DTO (onaylıysa ve isteniyorsa ödeme planıyla)
    private static LoanDto MapLoan(LoanApplication l, bool includePlan)
    {
        PaymentPlanDto? plan = null;
        if (includePlan && l.Status == LoanStatus.Approved)
        {
            var start = l.DecidedAt ?? DateTime.UtcNow;
            plan = PaymentPlanCalculator.Calculate(l.Amount, l.TermMonths, start);
        }

        return new LoanDto(
            l.Id, l.Income, l.Profession, l.Amount, l.TermMonths,
            l.Status.ToString(), l.Score, l.CreatedAt, l.DecidedAt, plan);
    }
}
