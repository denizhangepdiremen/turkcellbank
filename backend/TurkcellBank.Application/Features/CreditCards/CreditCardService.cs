using FluentValidation;
using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.CreditCards.Dtos;
using TurkcellBank.Application.Features.Loans;
using TurkcellBank.Application.Features.Loans.Dtos;
using TurkcellBank.Application.Features.Notifications;
using TurkcellBank.Application.Features.Payments;
using TurkcellBank.Application.Features.Payments.Dtos;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.CreditCards;

/// <summary>
/// Kredi kartı iş mantığı. Limit, kredi değerlendirme motoruyla (kredi başvurusuyla
/// aynı <see cref="ILoanAiEvaluator"/>) atanır; harcama Sanal POS'tan gelir ve borcu
/// anında artırır; borç ödeme TL hesaptan atomik düşülür.
/// </summary>
public class CreditCardService : ICreditCardService
{
    private const string Valid3DSCode = "123456";

    private readonly ICreditCardRepository _cards;
    private readonly IAccountRepository _accounts;
    private readonly IUserRepository _users;
    private readonly IReferenceCreditRepository _reference;
    private readonly IExternalBankLoanRepository _external;
    private readonly ILoanAiEvaluator _evaluator;
    private readonly IPaymentRepository _payments;
    private readonly IOperationContext _ctx;
    private readonly IValidator<CreditCardApplicationRequest> _applyValidator;
    private readonly IValidator<PayCreditCardRequest> _payValidator;
    private readonly IAuditLogger _audit;
    private readonly INotificationService _notifications;
    private readonly CreditCardOptions _options;

    public CreditCardService(
        ICreditCardRepository cards,
        IAccountRepository accounts,
        IUserRepository users,
        IReferenceCreditRepository reference,
        IExternalBankLoanRepository external,
        ILoanAiEvaluator evaluator,
        IPaymentRepository payments,
        IOperationContext ctx,
        IValidator<CreditCardApplicationRequest> applyValidator,
        IValidator<PayCreditCardRequest> payValidator,
        IAuditLogger audit,
        INotificationService notifications,
        CreditCardOptions options)
    {
        _cards = cards;
        _accounts = accounts;
        _users = users;
        _reference = reference;
        _external = external;
        _evaluator = evaluator;
        _payments = payments;
        _ctx = ctx;
        _applyValidator = applyValidator;
        _payValidator = payValidator;
        _audit = audit;
        _notifications = notifications;
        _options = options;
    }

    // ---------------------------------------------------------------- Başvuru
    public async Task<CreditCardDto> ApplyAsync(CreditCardApplicationRequest request)
    {
        var validation = await _applyValidator.ValidateAsync(request);
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
            throw new BusinessException("Başvuru yalnızca kayıtlı TC kimlik numaranızla yapılabilir.");

        // Tek aktif kart kuralı (MVP)
        var existing = await _cards.GetActiveByUserIdAsync(_ctx.ActingUserId);
        if (existing is not null)
            throw new BusinessException("Zaten bir kredi kartınız veya bekleyen başvurunuz var.");

        // 1) Referans nüfustan benzer profiller (kredi başvurusuyla aynı motor)
        var candidates = await _reference.GetCandidatesByIncomeAsync(request.Income, 400);
        var applicantForMatch = new LoanApplicationRequest(
            nationalId, request.Age, request.MaritalStatus, request.ChildrenCount,
            request.HousingStatus, request.Income, request.MonthlyExpenses,
            request.EmploymentMonths, profession, 0m, 0, Guid.Empty);
        var peers = PeerMatcher.SelectMostSimilar(applicantForMatch, candidates, 50);
        var peerDtos = peers
            .Select(p => new LoanPeer(
                p.Age, p.MonthlyIncome, p.MonthlyExpenses, p.MaritalStatus,
                p.ChildrenCount, p.HousingStatus, p.GrantedAmount, p.TermMonths, p.Defaulted))
            .ToList();

        var context = new LoanEvaluationContext(
            nationalId, request.Age, request.MaritalStatus, request.ChildrenCount,
            request.HousingStatus, request.Income, request.MonthlyExpenses,
            request.EmploymentMonths, profession, 0m, 0, peerDtos);

        var ai = await _evaluator.EvaluateAsync(context);

        // 2) Diğer bankalardaki borç, limit kapasitesini düşürür
        var externalLoans = await _external.GetByNationalIdAsync(nationalId);
        var externalDebt = externalLoans.Sum(e => e.RemainingDebt);

        // 3) Kart limiti = min(motor kapasitesi − mevcut borç, gelir × kat), 1.000'e yuvarla, banda kırp
        var incomeCap = request.Income * _options.IncomeMultiple;
        var capacity = Math.Max(0m, ai.MaxLimit - externalDebt);
        var raw = Math.Min(capacity, incomeCap);
        var rounded = Math.Round(raw / 1000m, MidpointRounding.AwayFromZero) * 1000m;

        var now = DateTime.UtcNow;
        var statementDay = request.StatementDay;

        // Benzersiz kart numarası üret
        string number;
        do { number = CardHelper.Generate16Digits(); }
        while (await _cards.CardNumberExistsAsync(number));

        var card = new CreditCard
        {
            Id = Guid.NewGuid(),
            UserId = _ctx.ActingUserId,
            CardNumber = number,
            ExpiryMonth = now.Month,
            ExpiryYear = now.Year + 4,
            Cvv = CardHelper.GenerateCvv(),
            StatementDay = statementDay,
            DueDayOffset = 10,
            NextStatementDate = ComputeNextStatement(now, statementDay),
            CurrentDebt = 0m,
            OnlineShoppingEnabled = true,
            OpenedAt = now,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };

        string title, body;

        // Reddedilecek kadar düşük kapasite mi?
        if (ai.MaxLimit <= 0m || rounded < _options.MinLimit)
        {
            card.Status = CreditCardStatus.Rejected;
            card.CreditLimit = 0m;
            card.Score = 0;
            card.DecidedAt = now;
            card.AiReason = ai.MaxLimit <= 0m
                ? ai.Reason
                : $"{ai.Reason} Hesaplanan kart limiti asgari {_options.MinLimit:N0} TL'nin altında kaldığı için başvurunuz olumsuz sonuçlandı.";
            title = "Kredi kartı başvurunuz reddedildi";
            body = "Gelir/gider profiliniz kredi kartı limiti için yeterli bulunmadı.";
        }
        else
        {
            var limit = Math.Min(rounded, _options.MaxLimit);
            card.CreditLimit = limit;
            card.Score = Math.Clamp((int)Math.Round((double)(limit / _options.MaxLimit) * 100), 1, 100);

            if (limit > _options.AutoApproveMaxLimit)
            {
                // Yüksek bant → yetkili onayına düşer
                card.Status = CreditCardStatus.PendingApproval;
                card.DecidedAt = null;
                card.AiReason = $"{ai.Reason} Tahsis edilen {limit:N0} TL limit, yüksek limit bandı nedeniyle yetkili onayına gönderilmiştir.";
                title = "Kredi kartı başvurunuz onay bekliyor";
                body = $"{limit:N0} TL limitli başvurunuz yetkili onayına gönderildi.";
            }
            else
            {
                card.Status = CreditCardStatus.Approved;
                card.DecidedAt = now;
                card.AiReason = $"{ai.Reason} Kart limitiniz {limit:N0} TL olarak belirlendi.";
                title = "Kredi kartınız onaylandı";
                body = $"{limit:N0} TL limitli kredi kartınız kullanıma hazır.";
            }
        }

        await _cards.AddCardAsync(card);

        await _audit.LogAsync("Kredi kartı başvurusu",
            $"{CardHelper.Mask(card.CardNumber)} — durum: {card.Status}, limit: {card.CreditLimit:N0} TL.");
        await _notifications.NotifyAsync(card.UserId, title, body);

        return Map(card);
    }

    // ---------------------------------------------------------------- Listeler
    public async Task<List<CreditCardDto>> GetMineAsync()
    {
        var cards = await _cards.GetByUserIdAsync(_ctx.ActingUserId);
        // Reddedilen kartlar listede gösterilmez (yalnızca bildirim olarak düşer).
        return cards
            .Where(c => c.Status != CreditCardStatus.Rejected)
            .Select(Map)
            .ToList();
    }

    public async Task<List<CreditCardStatementDto>> GetStatementsAsync(Guid cardId)
    {
        var card = await _cards.GetByIdAsync(cardId);
        if (card is null || card.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Kredi kartı bulunamadı.");

        var statements = await _cards.GetStatementsAsync(cardId);
        return statements.Select(MapStatement).ToList();
    }

    public async Task<List<CreditCardTransactionDto>> GetTransactionsAsync(Guid cardId)
    {
        var card = await _cards.GetByIdAsync(cardId);
        if (card is null || card.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Kredi kartı bulunamadı.");

        var txs = await _cards.GetTransactionsAsync(cardId);
        var plans = await _cards.GetPlansAsync(cardId);
        var countByPlan = plans.ToDictionary(p => p.Id, p => p.InstallmentCount);

        return txs.Select(t => new CreditCardTransactionDto(
            t.Id,
            t.Type.ToString(),
            t.Amount,
            t.Description,
            t.InstallmentNo,
            t.InstallmentPlanId is not null && countByPlan.TryGetValue(t.InstallmentPlanId.Value, out var cnt)
                ? cnt : (int?)null,
            t.StatementId,
            t.CreatedAt)).ToList();
    }

    // ---------------------------------------------------------------- Harcama (POS)
    public async Task<PaymentDto> SpendAsync(CreditCardSpendRequest request)
    {
        var card = await _cards.GetByIdAsync(request.CreditCardId);
        if (card is null || card.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Kredi kartı bulunamadı.");
        if (card.Status != CreditCardStatus.Approved)
            throw new BusinessException("Kredi kartınız aktif değil.");
        if (!card.OnlineShoppingEnabled)
            throw new BusinessException("Kredi kartınızda internet alışverişi kapalı. Güvenlik Merkezi'nden açabilirsiniz.");
        if (request.Amount <= 0m)
            throw new BusinessException("Tutar 0'dan büyük olmalı.");

        var installments = Math.Clamp(request.Installments <= 0 ? 1 : request.Installments, 1, _options.MaxInstallments);
        var masked = CardHelper.Mask(card.CardNumber);
        var now = DateTime.UtcNow;

        // 3D Secure kodu yanlışsa: başarısız kayıt + hata
        if (request.ThreeDSCode != Valid3DSCode)
        {
            await _payments.AddAsync(new Payment
            {
                Id = Guid.NewGuid(),
                UserId = _ctx.ActingUserId,
                CardId = card.Id,
                AccountId = null,
                MaskedCardNumber = masked,
                Amount = request.Amount,
                Status = PaymentStatus.Failed,
                Description = request.Description,
                CreatedAt = now,
                Channel = _ctx.Channel,
                PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
            });
            throw new BusinessException("3D Secure kodu hatalı.");
        }

        // Limit kontrolü
        var available = card.CreditLimit - card.CurrentDebt;
        if (request.Amount > available)
            throw new BusinessException("Kredi kartı limiti yetersiz.");

        // Taksit planı + borç artışı + ödeme kaydı (atomik)
        var plan = new CreditCardInstallmentPlan
        {
            Id = Guid.NewGuid(),
            CreditCardId = card.Id,
            TotalAmount = request.Amount,
            InstallmentCount = installments,
            InstallmentsBilled = 0,
            InstallmentAmount = Math.Round(request.Amount / installments, 2, MidpointRounding.AwayFromZero),
            Description = string.IsNullOrWhiteSpace(request.Description) ? "POS alışverişi" : request.Description!,
            CreatedAt = now,
        };
        card.CurrentDebt += request.Amount;
        _cards.AddPlan(plan);

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            UserId = _ctx.ActingUserId,
            CardId = card.Id,
            AccountId = null,
            MaskedCardNumber = masked,
            Amount = request.Amount,
            Status = PaymentStatus.Success,
            Description = request.Description,
            CreatedAt = now,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };
        _payments.Add(payment);

        await _cards.SaveChangesAsync(); // plan + borç + ödeme birlikte

        return new PaymentDto(payment.Id, payment.CardId, payment.MaskedCardNumber,
            payment.Amount, payment.Status.ToString(), payment.Description, payment.CreatedAt);
    }

    // ---------------------------------------------------------------- Borç ödeme
    public async Task<CreditCardDto> PayAsync(PayCreditCardRequest request)
    {
        var validation = await _payValidator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new Common.Exceptions.ValidationException(
                validation.Errors.Select(e => e.ErrorMessage).ToList());

        var card = await _cards.GetByIdAsync(request.CreditCardId);
        if (card is null || card.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Kredi kartı bulunamadı.");
        if (card.CurrentDebt <= 0m)
            throw new BusinessException("Ödenecek borç bulunmuyor.");

        var account = await _accounts.GetByIdAsync(request.SourceAccountId);
        if (account is null || account.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Hesap bulunamadı.");
        if (account.Currency != Currency.TRY)
            throw new BusinessException("Kredi kartı borcu yalnızca TL hesaptan ödenebilir.");
        if (!account.IsActive)
            throw new BusinessException("Kapalı hesaptan ödeme yapılamaz.");
        if (account.IsFrozen)
            throw new BusinessException("Dondurulmuş hesaptan ödeme yapılamaz.");

        var amount = request.Amount;
        if (amount > card.CurrentDebt)
            throw new BusinessException("Ödeme tutarı güncel borcu aşamaz.");
        if (account.Balance < amount)
            throw new BusinessException("Yetersiz bakiye.");

        // Atomik: TL hesaptan düş + borcu azalt + ekstre(ler)e dağıt + kayıtlar
        account.Balance -= amount;
        card.CurrentDebt -= amount;

        var unpaid = await _cards.GetUnpaidStatementsAsync(card.Id); // eskiden yeniye
        var remaining = amount;
        foreach (var st in unpaid)
        {
            if (remaining <= 0m) break;
            var pay = Math.Min(remaining, st.RemainingAmount);
            st.PaidAmount += pay;
            st.RemainingAmount -= pay;
            remaining -= pay;
            if (st.RemainingAmount <= 0m)
                st.Status = CreditCardStatementStatus.Paid;
        }

        var now = DateTime.UtcNow;
        _cards.AddLedgerTransaction(new Transaction
        {
            Id = Guid.NewGuid(),
            Type = TransactionType.CreditCardPayment,
            FromAccountId = account.Id,
            FromIban = account.Iban,
            Amount = amount,
            Description = "Kredi kartı öd.",
            CreatedAt = now,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        });
        _cards.AddTransaction(new CreditCardTransaction
        {
            Id = Guid.NewGuid(),
            CreditCardId = card.Id,
            Type = CreditCardTxType.Payment,
            Amount = amount,
            Description = "Borç ödemesi",
            CreatedAt = now,
        });

        await _cards.SaveChangesAsync();

        await _audit.LogAsync("Kredi kartı ödemesi",
            $"{CardHelper.Mask(card.CardNumber)} kartına {amount:N2} TL ödeme yapıldı.");

        return Map(card);
    }

    // ---------------------------------------------------------------- İnternet alışverişi
    public async Task<CreditCardDto> SetOnlineShoppingAsync(Guid cardId, bool enabled)
    {
        var card = await _cards.GetByIdAsync(cardId);
        if (card is null || card.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Kredi kartı bulunamadı.");

        card.OnlineShoppingEnabled = enabled;
        await _cards.SaveChangesAsync();
        return Map(card);
    }

    // ---------------------------------------------------------------- Admin / onay
    public async Task<List<AdminCreditCardDto>> GetAllForAdminAsync()
    {
        var cards = await _cards.GetAllWithUserAsync();
        return cards.Select(MapAdmin).ToList();
    }

    public async Task<List<AdminCreditCardDto>> GetPendingApprovalAsync()
    {
        var cards = await _cards.GetAllWithUserAsync();
        return cards
            .Where(c => c.Status == CreditCardStatus.PendingApproval)
            .Select(MapAdmin)
            .ToList();
    }

    public Task<CreditCardDto> ApproveAsync(Guid id) => DecideAsync(id, approve: true);
    public Task<CreditCardDto> RejectAsync(Guid id) => DecideAsync(id, approve: false);

    private async Task<CreditCardDto> DecideAsync(Guid id, bool approve)
    {
        var card = await _cards.GetByIdAsync(id)
            ?? throw new NotFoundException("Kredi kartı bulunamadı.");
        if (card.Status != CreditCardStatus.PendingApproval)
            throw new BusinessException("Bu başvuru zaten karara bağlanmış.");

        card.Status = approve ? CreditCardStatus.Approved : CreditCardStatus.Rejected;
        card.DecidedAt = DateTime.UtcNow;
        if (!approve) card.CreditLimit = 0m;
        await _cards.SaveChangesAsync();

        var verdict = approve ? "onaylandı" : "reddedildi";
        var masked = CardHelper.Mask(card.CardNumber);
        await _audit.LogAsync($"Kredi kartı {verdict}", $"{masked} numaralı kredi kartı başvurusu {verdict}.");
        await _notifications.NotifyAsync(card.UserId, $"Kredi kartınız {verdict}",
            approve
                ? $"{card.CreditLimit:N0} TL limitli kredi kartınız kullanıma hazır."
                : "Kredi kartı başvurunuz yetkili değerlendirmesi sonucu reddedildi.");

        return Map(card);
    }

    // ---------------------------------------------------------------- Yardımcılar
    /// <summary>Verilen kesim gününe göre bir sonraki kesim tarihini (UTC, 00:00) hesaplar.</summary>
    private static DateTime ComputeNextStatement(DateTime now, int statementDay)
    {
        var candidate = new DateTime(now.Year, now.Month, statementDay, 0, 0, 0, DateTimeKind.Utc);
        if (candidate <= now) candidate = candidate.AddMonths(1);
        return candidate;
    }

    private static CreditCardDto Map(CreditCard c) =>
        new(c.Id, CardHelper.Mask(c.CardNumber), c.ExpiryMonth, c.ExpiryYear,
            c.Status.ToString(), c.CreditLimit, c.CurrentDebt, c.CreditLimit - c.CurrentDebt,
            c.StatementDay, c.NextStatementDate, c.OnlineShoppingEnabled, c.Score, c.AiReason, c.OpenedAt);

    private static AdminCreditCardDto MapAdmin(CreditCard c) =>
        new(c.Id, c.User?.FullName ?? "—", c.User?.Email ?? "—", CardHelper.Mask(c.CardNumber),
            c.Status.ToString(), c.CreditLimit, c.Score, c.AiReason, c.OpenedAt, c.DecidedAt);

    private static CreditCardStatementDto MapStatement(CreditCardStatement s) =>
        new(s.Id, s.CreditCardId, s.PeriodStart, s.PeriodEnd, s.StatementDate, s.DueDate,
            s.TotalDue, s.MinimumPayment, s.PaidAmount, s.RemainingAmount, s.Status.ToString());
}
