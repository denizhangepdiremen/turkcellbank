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
    private readonly IOperationContext _ctx;
    private readonly IValidator<LoanApplicationRequest> _validator;
    private readonly LoanApprovalOptions _options;
    private readonly IAuditLogger _audit;
    private readonly Notifications.INotificationService _notifications;

    public LoanService(
        ILoanRepository loans,
        IUserRepository users,
        IReferenceCreditRepository reference,
        IExternalBankLoanRepository external,
        ILoanAiEvaluator evaluator,
        ICurrentUserService currentUser,
        IOperationContext ctx,
        IValidator<LoanApplicationRequest> validator,
        LoanApprovalOptions options,
        IAuditLogger audit,
        Notifications.INotificationService notifications)
    {
        _loans = loans;
        _users = users;
        _reference = reference;
        _external = external;
        _evaluator = evaluator;
        _currentUser = currentUser;
        _ctx = ctx;
        _validator = validator;
        _options = options;
        _audit = audit;
        _notifications = notifications;
    }

    public async Task<LoanDto> ApplyAsync(LoanApplicationRequest request)
    {
        var validation = await _validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new Common.Exceptions.ValidationException(
                validation.Errors.Select(e => e.ErrorMessage).ToList());

        var nationalId = request.NationalId.Trim();
        var profession = request.Profession.Trim();

        // TC kimlik no'yu (işlem sahibi) müşteriye bir kez kaydet
        var user = await _users.GetByIdAsync(_ctx.ActingUserId);
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

        var myLoans = await _loans.GetByUserIdAsync(_ctx.ActingUserId);
        var ourDebt = myLoans.Where(l => l.Status == LoanStatus.Approved).Sum(l => l.Amount);

        var existingDebt = externalDebt + ourDebt;

        // 4) Net limit + motorun tavsiyesi (deterministik)
        var netLimit = Math.Max(0, ai.MaxLimit - existingDebt);
        var recommended = request.Amount <= netLimit ? LoanStatus.Approved : LoanStatus.Rejected;

        // 5) Tutar bandı: otomatik mi (≤10M) yoksa yetkili onayına mı?
        var approverRole = DetermineApproverRole(request.Amount);
        var analysis = BuildAnalysis(ai.Reason, externalDebt, ourDebt, netLimit);

        LoanStatus status;
        string aiReason;
        string decidedBy;
        DateTime? decidedAt;

        if (approverRole is null)
        {
            // Otomatik karar (AI/kural motoru sonucu kesinleşir)
            status = recommended;
            aiReason = analysis + BuildVerdict(recommended, request.Amount, netLimit);
            decidedBy = "AI";
            decidedAt = DateTime.UtcNow;
        }
        else
        {
            // Yüksek tutar: karar yetkiliye bırakılır; AI raporu tavsiye olur
            status = LoanStatus.PendingApproval;
            aiReason = analysis +
                $"Talep ettiğiniz {request.Amount:N0} TL, tutarı nedeniyle " +
                $"{ApproverLabel(approverRole.Value)} onayına gönderilmiştir.";
            decidedBy = string.Empty;
            decidedAt = null;
        }

        var loan = new LoanApplication
        {
            Id = Guid.NewGuid(),
            UserId = _ctx.ActingUserId,
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
            Status = status,
            RecommendedStatus = recommended,
            RequiredApproverRole = approverRole,
            Score = LoanScoring.Calculate(request.Income, request.Amount, request.TermMonths),
            MaxLimit = ai.MaxLimit,
            ExistingDebt = existingDebt,
            NetLimit = netLimit,
            AiReason = aiReason,
            DecidedBy = decidedBy,
            DecisionNote = string.Empty,
            CreatedAt = DateTime.UtcNow,
            DecidedAt = decidedAt,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };

        await _loans.AddAsync(loan);
        return MapLoan(loan, includePlan: status == LoanStatus.Approved);
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

    // --- Yetkili onay kuyruğu ---
    // Tüm yetkililer (şube/il müdürü/direktör) onay bekleyen kredilerin tamamını
    // GÖRÜR; ancak sadece kendi bandındaki krediyi ONAYLAYABİLİR (CanApprove).
    // (Alt kademe üst bandı görüntüler ama onaylayamaz.)
    public async Task<List<PendingLoanDto>> GetPendingApprovalsAsync()
    {
        var loans = await _loans.GetByStatusWithUserAsync(LoanStatus.PendingApproval);
        var role = ParseRole(_currentUser.Role);

        return loans.Select(l => new PendingLoanDto(
            l.Id,
            l.User?.FullName ?? "—",
            l.User?.Email ?? "—",
            l.Age,
            l.MaritalStatus,
            l.ChildrenCount,
            l.HousingStatus,
            l.Income,
            l.MonthlyExpenses,
            l.EmploymentMonths,
            l.Profession,
            l.Amount,
            l.TermMonths,
            l.Score,
            l.MaxLimit,
            l.ExistingDebt,
            l.NetLimit,
            l.AiReason,
            l.RecommendedStatus.ToString(),
            l.RequiredApproverRole?.ToString() ?? "—",
            l.CreatedAt,
            CanApprove: role is not null && l.RequiredApproverRole == role)).ToList();
    }

    public Task<LoanDto> ApproveAsync(Guid id, string? note) => DecideAsync(id, note, approve: true);
    public Task<LoanDto> RejectAsync(Guid id, string? note) => DecideAsync(id, note, approve: false);

    // Yetkilinin onay/red kararı. Gemini tavsiyesi danışma niteliğindedir; yetkili
    // ezebilir (override). Bant ve görev ayrılığı kontrolleri burada uygulanır.
    private async Task<LoanDto> DecideAsync(Guid id, string? note, bool approve)
    {
        var loan = await _loans.GetByIdAsync(id)
            ?? throw new NotFoundException("Kredi başvurusu bulunamadı.");

        if (loan.Status != LoanStatus.PendingApproval)
            throw new BusinessException("Bu başvuru onay beklemiyor.");

        // Bant kontrolü: yalnızca krediye atanan rol karar verebilir
        var role = ParseRole(_currentUser.Role);
        if (role is null || loan.RequiredApproverRole != role)
            throw new BusinessException("Bu kredi sizin onay yetki bandınızda değil.");

        // Görev ayrılığı: kişi kendi başvurusunu onaylayamaz. Personel müşteri
        // olmadığından pratikte oluşmaz; yine de savunma amaçlı korunur.
        if (loan.UserId == _currentUser.UserId)
            throw new BusinessException("Kendi başvurunuzu onaylayamazsınız.");

        loan.Status = approve ? LoanStatus.Approved : LoanStatus.Rejected;
        loan.DecisionNote = note?.Trim() ?? string.Empty;
        loan.DecidedBy = DecidedByLabel(role.Value);
        loan.DecidedByUserId = _currentUser.UserId;
        loan.DecidedAt = DateTime.UtcNow;
        await _loans.SaveChangesAsync();

        // Denetim kaydı + müşteri bildirimi
        var verdict = approve ? "onaylandı" : "reddedildi";
        await _audit.LogAsync(
            $"Kredi {verdict}",
            $"{loan.Amount:N0} TL kredi başvurusu {verdict}.");
        await _notifications.NotifyAsync(
            loan.UserId,
            $"Krediniz {verdict}",
            $"{loan.Amount:N0} TL kredi başvurunuz {verdict}." +
            (string.IsNullOrWhiteSpace(loan.DecisionNote) ? "" : $" Not: {loan.DecisionNote}"));

        return MapLoan(loan, includePlan: approve);
    }

    // Tutar -> onaylayacak rol (null => otomatik karar bandı)
    private UserRole? DetermineApproverRole(decimal amount)
    {
        if (amount <= _options.AutoDecisionLimit) return null;
        if (amount <= _options.BranchManagerLimit) return UserRole.BranchManager;
        if (amount <= _options.ProvincialManagerLimit) return UserRole.ProvincialManager;
        return UserRole.Director;
    }

    private static UserRole? ParseRole(string? role) =>
        Enum.TryParse<UserRole>(role, out var r) ? r : null;

    // Onay bandı metni (gerekçe cümlesinde, küçük harf)
    private static string ApproverLabel(UserRole role) => role switch
    {
        UserRole.BranchManager => "şube müdürü",
        UserRole.ProvincialManager => "il müdürü",
        UserRole.Director => "direktör",
        _ => "yetkili",
    };

    // Kararı veren rol etiketi (DecidedBy alanında saklanır; ekranda gösterilir)
    private static string DecidedByLabel(UserRole role) => role switch
    {
        UserRole.BranchManager => "Şube Müdürü",
        UserRole.ProvincialManager => "İl Müdürü",
        UserRole.Director => "Direktör",
        _ => "Yetkili",
    };

    // Değerlendirme/analiz metni (motor + borçlar + net limit), karar cümlesi hariç.
    private static string BuildAnalysis(
        string aiReason, decimal externalDebt, decimal ourDebt, decimal netLimit)
    {
        var sb = new StringBuilder();
        sb.Append(aiReason).Append(' ');

        if (externalDebt > 0)
            sb.Append($"Diğer bankalardaki kalan borcunuz {externalDebt:N0} TL. ");
        if (ourDebt > 0)
            sb.Append($"Bankamızdaki mevcut kredi borcunuz {ourDebt:N0} TL. ");

        sb.Append($"Bankamızdan kullanabileceğiniz net limit {netLimit:N0} TL. ");
        return sb.ToString();
    }

    // Otomatik kredilerde karar cümlesi.
    private static string BuildVerdict(LoanStatus status, decimal requested, decimal netLimit) =>
        status == LoanStatus.Approved
            ? $"Talep ettiğiniz {requested:N0} TL onaylanmıştır."
            : $"Talep ettiğiniz {requested:N0} TL net limitinizi aştığı için reddedilmiştir. " +
              $"En fazla {netLimit:N0} TL kullanabilirsiniz.";

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
            l.AiReason, l.DecidedBy, l.DecisionNote, l.CreatedAt, l.DecidedAt, plan);
    }
}
