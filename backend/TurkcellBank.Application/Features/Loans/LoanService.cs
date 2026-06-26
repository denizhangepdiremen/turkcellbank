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
    private readonly IAccountRepository _accounts;
    private readonly ITransactionRepository _transactions;
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
        IAccountRepository accounts,
        ITransactionRepository transactions,
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
        _accounts = accounts;
        _transactions = transactions;
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

        var profession = request.Profession.Trim();

        var user = await _users.GetByIdAsync(_ctx.ActingUserId)
            ?? throw new NotFoundException("Kullanıcı bulunamadı.");

        var nationalId = user.NationalId.Trim();
        if (string.IsNullOrWhiteSpace(nationalId))
            throw new BusinessException("Kullanıcının TC kimlik numarası kayıtlı değil.");

        if (!string.Equals(request.NationalId.Trim(), nationalId, StringComparison.Ordinal))
            throw new BusinessException("Kredi başvurusu yalnızca kayıtlı TC kimlik numaranızla yapılabilir.");

        // Kredinin yatırılacağı hesap müşteriye ait, aktif ve dondurulmamış olmalı
        var disburseAccount = await GetDisbursableAccountAsync(request.DisbursementAccountId);

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
            DisbursementAccountId = disburseAccount.Id,
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

        // Otomatik onaylanan kredilerde parayı hemen hesaba yatır
        if (status == LoanStatus.Approved)
            await DisburseAsync(loan, disburseAccount);

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

    // Kendi bandımda karara bağlanmış (onaylanan/reddedilen) krediler — "Geçmiş" sekmesi.
    // kim (kararı veren yetkilinin adı) / ne zaman / gerekçe ile birlikte döner.
    public async Task<List<LoanHistoryDto>> GetDecidedAsync()
    {
        var role = ParseRole(_currentUser.Role);
        var all = await _loans.GetAllWithUserAsync();
        var decided = all
            .Where(l => l.Status is LoanStatus.Approved or LoanStatus.Rejected)
            .Where(l => role is not null && l.RequiredApproverRole == role)
            .OrderByDescending(l => l.DecidedAt ?? l.CreatedAt)
            .ToList();

        // Kararı veren yetkililerin adlarını topluca çöz (N+1 önle)
        var deciderNames = new Dictionary<Guid, string>();
        foreach (var id in decided.Where(l => l.DecidedByUserId.HasValue)
                     .Select(l => l.DecidedByUserId!.Value).Distinct())
        {
            var u = await _users.GetByIdAsync(id);
            if (u is not null) deciderNames[id] = u.FullName;
        }

        return decided.Select(l => new LoanHistoryDto(
            l.Id,
            l.User?.FullName ?? "—",
            l.User?.Email ?? "—",
            l.Amount,
            l.TermMonths,
            l.Status.ToString(),
            l.DecidedByUserId is Guid did && deciderNames.TryGetValue(did, out var n)
                ? n
                : (string.IsNullOrEmpty(l.DecidedBy) ? "—" : l.DecidedBy),
            l.DecidedBy,
            l.DecisionNote,
            l.DecidedAt,
            l.CreatedAt)).ToList();
    }

    public async Task<LoanDto> PayInstallmentAsync(Guid loanId, Guid accountId)
    {
        var loan = await _loans.GetByIdAsync(loanId);
        if (loan is null || loan.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Kredi başvurusu bulunamadı.");

        if (loan.Status != LoanStatus.Approved)
            throw new BusinessException("Sadece onaylı kredilerin taksiti ödenir.");
        if (loan.InstallmentsPaid >= loan.TermMonths)
            throw new BusinessException("Bu kredinin tüm taksitleri ödenmiş.");

        var account = await GetDisbursableAccountAsync(accountId);

        // Son taksitte kalan borç tam kapatılır (yuvarlama farkını engelle)
        var isLast = loan.InstallmentsPaid + 1 >= loan.TermMonths;
        var amount = isLast ? loan.RemainingDebt : loan.MonthlyInstallment;

        if (account.Balance < amount)
            throw new BusinessException("Taksit için yeterli bakiye yok.");

        account.Balance -= amount;
        loan.RemainingDebt = isLast ? 0m : loan.RemainingDebt - amount;
        loan.InstallmentsPaid += 1;

        var tx = new Transaction
        {
            Id = Guid.NewGuid(),
            Type = TransactionType.LoanRepayment,
            FromAccountId = account.Id,
            FromIban = account.Iban,
            Amount = amount,
            Description = "Kredi taksiti",
            CreatedAt = DateTime.UtcNow,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };
        await _transactions.AddAsync(tx); // bakiye + taksit sayacı birlikte (atomik)

        // Kredi tamamen kapandıysa müşteriye bildir
        if (loan.InstallmentsPaid >= loan.TermMonths)
            await _notifications.NotifyAsync(loan.UserId, "Krediniz tamamen ödendi",
                $"{loan.Amount:N0} TL kredinizin tüm taksitleri ödenmiştir. Geçmiş olsun!");

        return MapLoan(loan, includePlan: true);
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

        // Onaylandıysa anaparayı başvuruda seçilen hesaba yatır
        if (approve)
        {
            var account = loan.DisbursementAccountId is null
                ? null
                : await _accounts.GetByIdAsync(loan.DisbursementAccountId.Value);
            if (account is null || !account.IsActive || account.IsFrozen)
                throw new BusinessException(
                    "Kredinin yatırılacağı hesap artık uygun değil; müşteriden güncel hesap alın.");
            await DisburseAsync(loan, account);
        }

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

    // Kredinin yatırılacağı hesabı doğrula: işlem sahibine ait, aktif, dondurulmamış
    private async Task<Account> GetDisbursableAccountAsync(Guid accountId)
    {
        var account = await _accounts.GetByIdAsync(accountId);
        if (account is null || account.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Hesap bulunamadı.");
        if (!account.IsActive)
            throw new BusinessException("Kapalı hesap kredi işlemlerinde kullanılamaz.");
        if (account.IsFrozen)
            throw new BusinessException("Dondurulmuş hesap kredi işlemlerinde kullanılamaz.");
        return account;
    }

    // Anaparayı hesaba yatır + geri ödeme planını (taksit/kalan borç) yaz
    private async Task DisburseAsync(LoanApplication loan, Account account)
    {
        var plan = PaymentPlanCalculator.Calculate(
            loan.Amount, loan.TermMonths, loan.DecidedAt ?? DateTime.UtcNow);

        loan.MonthlyInstallment = plan.MonthlyPayment;
        loan.RemainingDebt = plan.TotalPayment;
        loan.InstallmentsPaid = 0;

        account.Balance += loan.Amount;

        var tx = new Transaction
        {
            Id = Guid.NewGuid(),
            Type = TransactionType.LoanDisbursement,
            ToAccountId = account.Id,
            ToIban = account.Iban,
            Amount = loan.Amount,
            Description = "Kredi kullandırımı",
            CreatedAt = DateTime.UtcNow,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };
        await _transactions.AddAsync(tx); // bakiye + kredi alanları + işlem birlikte (atomik)
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
            l.AiReason, l.DecidedBy, l.DecisionNote,
            l.MonthlyInstallment, l.RemainingDebt, l.InstallmentsPaid,
            l.CreatedAt, l.DecidedAt, plan);
    }
}
