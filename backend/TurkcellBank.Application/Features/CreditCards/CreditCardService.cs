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
    private readonly IValidator<CreditCardCashAdvanceRequest> _cashAdvanceValidator;
    private readonly IValidator<CreditCardLimitIncreaseRequestDto> _limitIncreaseValidator;
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
        IValidator<CreditCardCashAdvanceRequest> cashAdvanceValidator,
        IValidator<CreditCardLimitIncreaseRequestDto> limitIncreaseValidator,
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
        _cashAdvanceValidator = cashAdvanceValidator;
        _limitIncreaseValidator = limitIncreaseValidator;
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

    // ---------------------------------------------------------------- Nakit avans
    public async Task<CreditCardDto> CashAdvanceAsync(CreditCardCashAdvanceRequest request)
    {
        var validation = await _cashAdvanceValidator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new Common.Exceptions.ValidationException(
                validation.Errors.Select(e => e.ErrorMessage).ToList());

        var card = await _cards.GetByIdAsync(request.CreditCardId);
        if (card is null || card.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Kredi kartı bulunamadı.");
        if (card.Status != CreditCardStatus.Approved)
            throw new BusinessException("Kredi kartınız aktif değil.");

        var account = await _accounts.GetByIdAsync(request.TargetAccountId);
        if (account is null || account.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Hesap bulunamadı.");
        if (account.Currency != Currency.TRY)
            throw new BusinessException("Nakit avans yalnızca TL hesaba aktarılabilir.");
        if (!account.IsActive)
            throw new BusinessException("Kapalı hesaba nakit avans aktarılamaz.");
        if (account.IsFrozen)
            throw new BusinessException("Dondurulmuş hesaba nakit avans aktarılamaz.");

        var amount = request.Amount;
        var fee = Math.Round(Math.Max(amount * _options.CashAdvanceFeeRate, _options.CashAdvanceMinFee), 2, MidpointRounding.AwayFromZero);
        var interest = Math.Round(amount * (_options.MonthlyContractInterestRate / 30m), 2, MidpointRounding.AwayFromZero);
        var debtIncrease = amount + fee + interest;

        var available = card.CreditLimit - card.CurrentDebt;
        if (debtIncrease > available)
            throw new BusinessException(
                $"Nakit avans için kredi kartı limiti yetersiz. Komisyon/faiz dahil gereken tutar {debtIncrease:N2} TL, kullanılabilir limit {available:N2} TL.");

        var now = DateTime.UtcNow;
        account.Balance += amount;
        card.CurrentDebt += debtIncrease;

        _cards.AddLedgerTransaction(new Transaction
        {
            Id = Guid.NewGuid(),
            Type = TransactionType.CreditCardAdvance,
            ToAccountId = account.Id,
            ToIban = account.Iban,
            Amount = amount,
            Description = "Nakit avans",
            CreatedAt = now,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        });
        _cards.AddTransaction(new CreditCardTransaction
        {
            Id = Guid.NewGuid(),
            CreditCardId = card.Id,
            Type = CreditCardTxType.CashAdvance,
            Amount = amount,
            Description = "Nakit avans",
            CreatedAt = now,
        });
        _cards.AddTransaction(new CreditCardTransaction
        {
            Id = Guid.NewGuid(),
            CreditCardId = card.Id,
            Type = CreditCardTxType.Fee,
            Amount = fee,
            Description = "Nakit avans komisyonu",
            CreatedAt = now,
        });
        if (interest > 0m)
        {
            _cards.AddTransaction(new CreditCardTransaction
            {
                Id = Guid.NewGuid(),
                CreditCardId = card.Id,
                Type = CreditCardTxType.Interest,
                Amount = interest,
                Description = "Nakit avans günlük faizi",
                CreatedAt = now,
            });
        }

        await _cards.SaveChangesAsync();

        await _audit.LogAsync("Kredi kartı nakit avans",
            $"{CardHelper.Mask(card.CardNumber)} kartından {amount:N2} TL nakit avans kullanıldı.");
        await _notifications.NotifyAsync(card.UserId, "Nakit avans kullanıldı",
            $"{amount:N2} TL nakit avans hesabınıza aktarıldı. Komisyon/faiz toplamı {fee + interest:N2} TL.");

        return Map(card);
    }

    // ---------------------------------------------------------------- Limit artış talebi
    public async Task<CreditCardLimitIncreaseDto> RequestLimitIncreaseAsync(CreditCardLimitIncreaseRequestDto request)
    {
        var validation = await _limitIncreaseValidator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new Common.Exceptions.ValidationException(
                validation.Errors.Select(e => e.ErrorMessage).ToList());

        var card = await _cards.GetByIdAsync(request.CreditCardId);
        if (card is null || card.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Kredi kartı bulunamadı.");
        if (card.Status != CreditCardStatus.Approved)
            throw new BusinessException("Yalnızca aktif kredi kartı için limit artışı talep edilebilir.");
        if (request.RequestedLimit <= card.CreditLimit)
            throw new BusinessException("Talep edilen limit mevcut limitten yüksek olmalı.");
        if (request.RequestedLimit > _options.MaxLimit)
            throw new BusinessException($"Talep edilen limit en fazla {_options.MaxLimit:N0} TL olabilir.");
        if (await _cards.HasPendingLimitIncreaseRequestAsync(card.Id))
            throw new BusinessException("Bu kart için bekleyen bir limit artış talebiniz var.");

        var user = await _users.GetByIdAsync(_ctx.ActingUserId)
            ?? throw new NotFoundException("Kullanıcı bulunamadı.");
        var nationalId = user.NationalId.Trim();

        var evaluation = await EvaluateLimitCapacityAsync(
            nationalId,
            request.Age,
            request.MaritalStatus,
            request.ChildrenCount,
            request.HousingStatus,
            request.Income,
            request.MonthlyExpenses,
            request.EmploymentMonths,
            request.Profession.Trim());

        var now = DateTime.UtcNow;
        var limitRequest = new CreditCardLimitIncreaseRequest
        {
            Id = Guid.NewGuid(),
            CreditCardId = card.Id,
            UserId = card.UserId,
            CurrentLimit = card.CreditLimit,
            RequestedLimit = request.RequestedLimit,
            RecommendedLimit = evaluation.Limit,
            Age = request.Age,
            MaritalStatus = request.MaritalStatus,
            ChildrenCount = request.ChildrenCount,
            HousingStatus = request.HousingStatus,
            Income = request.Income,
            MonthlyExpenses = request.MonthlyExpenses,
            EmploymentMonths = request.EmploymentMonths,
            Profession = request.Profession.Trim(),
            Score = evaluation.Score,
            CreatedAt = now,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };

        if (request.RequestedLimit > evaluation.Limit)
        {
            limitRequest.Status = CreditCardLimitRequestStatus.Rejected;
            limitRequest.DecidedAt = now;
            limitRequest.AiReason = $"{evaluation.Reason} Talep edilen limit, hesaplanan {evaluation.Limit:N0} TL kapasiteyi aştığı için reddedildi.";
        }
        else if (request.RequestedLimit > _options.AutoApproveMaxLimit)
        {
            limitRequest.Status = CreditCardLimitRequestStatus.PendingApproval;
            limitRequest.AiReason = $"{evaluation.Reason} {request.RequestedLimit:N0} TL talep yüksek limit bandında olduğu için yetkili onayına gönderildi.";
        }
        else
        {
            limitRequest.Status = CreditCardLimitRequestStatus.Approved;
            limitRequest.DecidedAt = now;
            limitRequest.AiReason = $"{evaluation.Reason} Limitiniz {request.RequestedLimit:N0} TL olarak güncellendi.";
            card.CreditLimit = request.RequestedLimit;
        }

        _cards.AddLimitIncreaseRequest(limitRequest);
        await _cards.SaveChangesAsync();

        await _audit.LogAsync("Kredi kartı limit artış talebi",
            $"{CardHelper.Mask(card.CardNumber)} kartı için {request.RequestedLimit:N0} TL talep oluşturuldu; durum: {limitRequest.Status}.");
        await _notifications.NotifyAsync(card.UserId, "Limit artış talebiniz alındı",
            limitRequest.Status == CreditCardLimitRequestStatus.PendingApproval
                ? "Limit artış talebiniz yetkili onayına gönderildi."
                : limitRequest.Status == CreditCardLimitRequestStatus.Approved
                    ? $"{request.RequestedLimit:N0} TL yeni limitiniz kullanıma açıldı."
                    : "Limit artış talebiniz gelir/gider profiliniz nedeniyle reddedildi.");

        return MapLimitRequest(limitRequest, card);
    }

    public async Task<List<CreditCardLimitIncreaseDto>> GetLimitIncreaseRequestsAsync(Guid cardId)
    {
        var card = await _cards.GetByIdAsync(cardId);
        if (card is null || card.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Kredi kartı bulunamadı.");

        var requests = await _cards.GetLimitIncreaseRequestsByCardIdAsync(cardId);
        return requests.Select(r => MapLimitRequest(r, card)).ToList();
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
        var cardApprovals = cards
            .Where(c => c.Status == CreditCardStatus.PendingApproval)
            .Select(MapAdmin)
            .ToList();
        var limitRequests = await _cards.GetPendingLimitIncreaseRequestsAsync();
        cardApprovals.AddRange(limitRequests.Select(MapAdminLimitRequest));
        return cardApprovals
            .OrderByDescending(a => a.OpenedAt)
            .ToList();
    }

    public Task<CreditCardDto> ApproveAsync(Guid id) => DecideAsync(id, approve: true);
    public Task<CreditCardDto> RejectAsync(Guid id) => DecideAsync(id, approve: false);
    public Task<CreditCardDto> ApproveLimitIncreaseAsync(Guid id) => DecideLimitIncreaseAsync(id, approve: true);
    public async Task<CreditCardLimitIncreaseDto> RejectLimitIncreaseAsync(Guid id)
    {
        await DecideLimitIncreaseAsync(id, approve: false);
        var request = await _cards.GetLimitIncreaseRequestByIdAsync(id)
            ?? throw new NotFoundException("Limit artış talebi bulunamadı.");
        return MapLimitRequest(request, request.CreditCard ?? throw new NotFoundException("Kredi kartı bulunamadı."));
    }

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

    private async Task<CreditCardDto> DecideLimitIncreaseAsync(Guid id, bool approve)
    {
        var request = await _cards.GetLimitIncreaseRequestByIdAsync(id)
            ?? throw new NotFoundException("Limit artış talebi bulunamadı.");
        if (request.CreditCard is null)
            throw new NotFoundException("Kredi kartı bulunamadı.");
        if (request.Status != CreditCardLimitRequestStatus.PendingApproval)
            throw new BusinessException("Bu limit artış talebi zaten karara bağlanmış.");

        request.Status = approve ? CreditCardLimitRequestStatus.Approved : CreditCardLimitRequestStatus.Rejected;
        request.DecidedAt = DateTime.UtcNow;
        request.DecidedByUserId = _ctx.PerformedByEmployeeId ?? _ctx.ActingUserId;
        if (approve)
            request.CreditCard.CreditLimit = request.RequestedLimit;

        await _cards.SaveChangesAsync();

        var verdict = approve ? "onaylandı" : "reddedildi";
        var masked = CardHelper.Mask(request.CreditCard.CardNumber);
        await _audit.LogAsync($"Kredi kartı limit artışı {verdict}",
            $"{masked} kartı için {request.RequestedLimit:N0} TL limit artış talebi {verdict}.");
        await _notifications.NotifyAsync(request.UserId, $"Limit artış talebiniz {verdict}",
            approve
                ? $"Kredi kartı limitiniz {request.RequestedLimit:N0} TL olarak güncellendi."
                : "Limit artış talebiniz yetkili değerlendirmesi sonucu reddedildi.");

        return Map(request.CreditCard);
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
        new(c.Id, c.Id, "Application", c.User?.FullName ?? "—", c.User?.Email ?? "—", CardHelper.Mask(c.CardNumber),
            c.Status.ToString(), c.CreditLimit, c.CreditLimit, c.CreditLimit, c.CreditLimit, c.Score, c.AiReason, c.OpenedAt, c.DecidedAt);

    private static AdminCreditCardDto MapAdminLimitRequest(CreditCardLimitIncreaseRequest r) =>
        new(r.Id, r.CreditCardId, "LimitIncrease", r.User?.FullName ?? "—", r.User?.Email ?? "—",
            r.CreditCard is null ? "—" : CardHelper.Mask(r.CreditCard.CardNumber),
            r.Status.ToString(), r.CurrentLimit, r.RequestedLimit, r.RecommendedLimit, r.RequestedLimit,
            r.Score, r.AiReason, r.CreatedAt, r.DecidedAt);

    private static CreditCardStatementDto MapStatement(CreditCardStatement s) =>
        new(s.Id, s.CreditCardId, s.PeriodStart, s.PeriodEnd, s.StatementDate, s.DueDate,
            s.TotalDue, s.MinimumPayment, s.PaidAmount, s.RemainingAmount,
            s.TotalInterestApplied, s.LastInterestAppliedAt, s.Status.ToString());

    private static CreditCardLimitIncreaseDto MapLimitRequest(CreditCardLimitIncreaseRequest r, CreditCard card) =>
        new(r.Id, r.CreditCardId, CardHelper.Mask(card.CardNumber), r.CurrentLimit, r.RequestedLimit,
            r.RecommendedLimit, r.Status.ToString(), r.Score, r.AiReason, r.CreatedAt, r.DecidedAt);

    private async Task<(decimal Limit, int Score, string Reason)> EvaluateLimitCapacityAsync(
        string nationalId,
        int age,
        MaritalStatus maritalStatus,
        int childrenCount,
        HousingStatus housingStatus,
        decimal income,
        decimal monthlyExpenses,
        int employmentMonths,
        string profession)
    {
        var candidates = await _reference.GetCandidatesByIncomeAsync(income, 400);
        var applicantForMatch = new LoanApplicationRequest(
            nationalId, age, maritalStatus, childrenCount, housingStatus, income, monthlyExpenses,
            employmentMonths, profession, 0m, 0, Guid.Empty);
        var peers = PeerMatcher.SelectMostSimilar(applicantForMatch, candidates, 50);
        var peerDtos = peers
            .Select(p => new LoanPeer(
                p.Age, p.MonthlyIncome, p.MonthlyExpenses, p.MaritalStatus,
                p.ChildrenCount, p.HousingStatus, p.GrantedAmount, p.TermMonths, p.Defaulted))
            .ToList();
        var context = new LoanEvaluationContext(
            nationalId, age, maritalStatus, childrenCount, housingStatus, income, monthlyExpenses,
            employmentMonths, profession, 0m, 0, peerDtos);
        var ai = await _evaluator.EvaluateAsync(context);
        var externalLoans = await _external.GetByNationalIdAsync(nationalId);
        var externalDebt = externalLoans.Sum(e => e.RemainingDebt);
        var incomeCap = income * _options.IncomeMultiple;
        var capacity = Math.Max(0m, ai.MaxLimit - externalDebt);
        var raw = Math.Min(capacity, incomeCap);
        var rounded = Math.Round(raw / 1000m, MidpointRounding.AwayFromZero) * 1000m;
        var limit = Math.Min(Math.Max(0m, rounded), _options.MaxLimit);
        var score = limit <= 0m
            ? 0
            : Math.Clamp((int)Math.Round((double)(limit / _options.MaxLimit) * 100), 1, 100);
        return (limit, score, $"{ai.Reason} Mevcut dış borçlar düşüldükten sonra önerilen kart limiti {limit:N0} TL.");
    }
}
