using System.Text;
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
    private readonly IUserRepository _users;
    private readonly IReferenceCreditRepository _reference;
    private readonly IExternalBankLoanRepository _external;
    private readonly ILoanAiEvaluator _evaluator;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<LoanApplicationRequest> _validator;

    public LoanService(
        ILoanRepository loans,
        IUserRepository users,
        IReferenceCreditRepository reference,
        IExternalBankLoanRepository external,
        ILoanAiEvaluator evaluator,
        ICurrentUserService currentUser,
        IValidator<LoanApplicationRequest> validator)
    {
        _loans = loans;
        _users = users;
        _reference = reference;
        _external = external;
        _evaluator = evaluator;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<LoanDto> ApplyAsync(LoanApplicationRequest request)
    {
        var validation = await _validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new Common.Exceptions.ValidationException(
                validation.Errors.Select(e => e.ErrorMessage).ToList());

        var nationalId = request.NationalId.Trim();
        var profession = request.Profession.Trim();

        // TC kimlik no'yu kullanıcıya bir kez kaydet (sonraki başvurularda kullanılır)
        var user = await _users.GetByIdAsync(_currentUser.UserId);
        if (user is not null && string.IsNullOrWhiteSpace(user.NationalId))
        {
            user.NationalId = nationalId;
            await _users.SaveChangesAsync();
        }

        // 1) Referans nüfustan benzer profilleri çek (değerlendirme bağlamı):
        //    önce gelir bandından geniş aday havuzu (index'li, hızlı), sonra
        //    çok-faktörlü benzerlikle en yakın 50 kayıt (PeerMatcher).
        var candidates = await _reference.GetCandidatesByIncomeAsync(request.Income, 400);
        var peers = PeerMatcher.SelectMostSimilar(request, candidates, 50);
        var peerDtos = peers
            .Select(p => new LoanPeer(
                p.Age, p.MonthlyIncome, p.MonthlyExpenses, p.MaritalStatus,
                p.ChildrenCount, p.HousingStatus, p.GrantedAmount, p.TermMonths, p.Defaulted))
            .ToList();

        // 2) AI / kural motoru: tahmini maksimum limit
        var context = new LoanEvaluationContext(
            nationalId, request.Age, request.MaritalStatus, request.ChildrenCount,
            request.HousingStatus, request.Income, request.MonthlyExpenses,
            request.EmploymentMonths, profession, request.Amount, request.TermMonths, peerDtos);

        var ai = await _evaluator.EvaluateAsync(context);

        // 3) Mevcut borçlar: diğer bankalar (TC ile) + bizim bankadaki onaylı krediler
        var externalLoans = await _external.GetByNationalIdAsync(nationalId);
        var externalDebt = externalLoans.Sum(e => e.RemainingDebt);

        var myLoans = await _loans.GetByUserIdAsync(_currentUser.UserId);
        var ourDebt = myLoans.Where(l => l.Status == LoanStatus.Approved).Sum(l => l.Amount);

        var existingDebt = externalDebt + ourDebt;

        // 4) Net limit + otomatik karar
        var netLimit = Math.Max(0, ai.MaxLimit - existingDebt);
        var approved = request.Amount <= netLimit;

        var reason = BuildReason(
            ai.Reason, externalDebt, ourDebt, netLimit, request.Amount, approved);

        var loan = new LoanApplication
        {
            Id = Guid.NewGuid(),
            UserId = _currentUser.UserId,
            NationalId = nationalId,
            Age = request.Age,
            MaritalStatus = request.MaritalStatus,
            ChildrenCount = request.ChildrenCount,
            HousingStatus = request.HousingStatus,
            Income = request.Income,
            MonthlyExpenses = request.MonthlyExpenses,
            EmploymentMonths = request.EmploymentMonths,
            Profession = profession,
            Amount = request.Amount,
            TermMonths = request.TermMonths,
            Status = approved ? LoanStatus.Approved : LoanStatus.Rejected,
            Score = LoanScoring.Calculate(request.Income, request.Amount, request.TermMonths),
            MaxLimit = ai.MaxLimit,
            ExistingDebt = existingDebt,
            NetLimit = netLimit,
            AiReason = reason,
            DecidedBy = "AI",
            CreatedAt = DateTime.UtcNow,
            DecidedAt = DateTime.UtcNow,
        };

        await _loans.AddAsync(loan);
        return MapLoan(loan, includePlan: approved);
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
            l.MaxLimit,
            l.NetLimit,
            l.AiReason,
            l.DecidedBy,
            l.CreatedAt,
            l.DecidedAt)).ToList();
    }

    // --- Manuel admin onay/red ŞİMDİLİK DEVRE DIŞI ---
    // Krediler başvuru anında AI/kural motoruyla otomatik karara bağlanır.
    // Endpoint'ler ve arayüz korunur; ileride tutar bazlı onay hiyerarşisi
    // (ör. >1M TL şube müdürü, >10M TL ilçe müdürü) burada devreye alınacaktır.
    public Task<LoanDto> ApproveAsync(Guid id) =>
        throw new BusinessException(
            "Krediler otomatik değerlendiriliyor; manuel onay şu an devre dışı.");

    public Task<LoanDto> RejectAsync(Guid id) =>
        throw new BusinessException(
            "Krediler otomatik değerlendiriliyor; manuel red şu an devre dışı.");

    // Onay/red gerekçesini (motor + borç + karar) tek metinde birleştirir.
    private static string BuildReason(
        string aiReason, decimal externalDebt, decimal ourDebt,
        decimal netLimit, decimal requested, bool approved)
    {
        var sb = new StringBuilder();
        sb.Append(aiReason).Append(' ');

        if (externalDebt > 0)
            sb.Append($"Diğer bankalardaki kalan borcunuz {externalDebt:N0} TL. ");
        if (ourDebt > 0)
            sb.Append($"Bankamızdaki mevcut kredi borcunuz {ourDebt:N0} TL. ");

        sb.Append($"Bankamızdan kullanabileceğiniz net limit {netLimit:N0} TL. ");

        sb.Append(approved
            ? $"Talep ettiğiniz {requested:N0} TL onaylanmıştır."
            : $"Talep ettiğiniz {requested:N0} TL net limitinizi aştığı için reddedilmiştir. " +
              $"En fazla {netLimit:N0} TL kullanabilirsiniz.");

        return sb.ToString();
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
            l.Status.ToString(), l.Score, l.MaxLimit, l.ExistingDebt, l.NetLimit,
            l.AiReason, l.DecidedBy, l.CreatedAt, l.DecidedAt, plan);
    }
}
