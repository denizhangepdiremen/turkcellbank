using FluentValidation;
using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Bills.Dtos;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Bills;

public class BillService : IBillService
{
    private readonly IBillPaymentRepository _bills;
    private readonly IAccountRepository _accounts;
    private readonly ITransactionRepository _transactions;
    private readonly IOperationContext _ctx;
    private readonly IValidator<BillInquiryRequest> _inquiryValidator;
    private readonly IValidator<PayBillRequest> _payValidator;

    public BillService(
        IBillPaymentRepository bills,
        IAccountRepository accounts,
        ITransactionRepository transactions,
        IOperationContext ctx,
        IValidator<BillInquiryRequest> inquiryValidator,
        IValidator<PayBillRequest> payValidator)
    {
        _bills = bills;
        _accounts = accounts;
        _transactions = transactions;
        _ctx = ctx;
        _inquiryValidator = inquiryValidator;
        _payValidator = payValidator;
    }

    public List<BillerDto> GetBillers() =>
        BillerCatalog.All
            .Select(b => new BillerDto(b.Code, b.Name, b.Category.ToString()))
            .ToList();

    public async Task<BillInquiryDto> InquireAsync(BillInquiryRequest request)
    {
        var validation = await _inquiryValidator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new Common.Exceptions.ValidationException(
                validation.Errors.Select(e => e.ErrorMessage).ToList());

        var biller = BillerCatalog.Find(request.BillerCode)
            ?? throw new NotFoundException("Kurum bulunamadı.");

        var period = BillerCatalog.CurrentPeriod();
        var paid = await _bills.IsPaidAsync(biller.Code, request.SubscriberNo, period);

        var amount = paid
            ? 0m
            : BillerCatalog.ComputeAmount(biller.Code, request.SubscriberNo, period, biller.Category);

        return new BillInquiryDto(
            biller.Code,
            biller.Name,
            biller.Category.ToString(),
            request.SubscriberNo,
            period,
            amount,
            DueDate(period),
            paid);
    }

    public async Task<BillPaymentDto> PayAsync(PayBillRequest request)
    {
        var validation = await _payValidator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new Common.Exceptions.ValidationException(
                validation.Errors.Select(e => e.ErrorMessage).ToList());

        var biller = BillerCatalog.Find(request.BillerCode)
            ?? throw new NotFoundException("Kurum bulunamadı.");

        var period = BillerCatalog.CurrentPeriod();

        // Bu dönemin faturası zaten ödenmiş mi? (çift ödemeyi engelle)
        if (await _bills.IsPaidAsync(biller.Code, request.SubscriberNo, period))
            throw new BusinessException("Bu faturanın bu dönemi zaten ödenmiş.");

        // Hesap işlemin sahibine mi ait? (varlığı sızdırma → NotFound)
        var account = await _accounts.GetByIdAsync(request.AccountId);
        if (account is null || account.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Hesap bulunamadı.");
        if (!account.IsActive)
            throw new BusinessException("Seçilen hesap kapalı.");
        if (account.IsFrozen)
            throw new BusinessException("Seçilen hesap dondurulmuş.");

        // Tutar sunucuda yeniden hesaplanır (istemciye güvenilmez)
        var amount = BillerCatalog.ComputeAmount(biller.Code, request.SubscriberNo, period, biller.Category);

        if (account.Balance < amount)
            throw new BusinessException("Yetersiz bakiye.");

        // Hesaptan düş + fatura kaydı + işlem kaydı (tek SaveChanges, atomik)
        account.Balance -= amount;

        var billPayment = new BillPayment
        {
            Id = Guid.NewGuid(),
            UserId = _ctx.ActingUserId,
            AccountId = account.Id,
            Category = biller.Category,
            BillerCode = biller.Code,
            BillerName = biller.Name,
            SubscriberNo = request.SubscriberNo,
            Period = period,
            Amount = amount,
            CreatedAt = DateTime.UtcNow,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };

        var tx = new Transaction
        {
            Id = Guid.NewGuid(),
            Type = TransactionType.BillPayment,
            FromAccountId = account.Id,
            FromIban = account.Iban,
            Amount = amount,
            Description = Truncate(biller.Name, 20),
            CreatedAt = DateTime.UtcNow,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };

        await _bills.AddAsync(billPayment); // hesap + işlem + fatura birlikte kaydolur
        await _transactions.AddAsync(tx);

        return Map(billPayment, account.Iban);
    }

    public async Task<List<BillPaymentDto>> GetMyPaymentsAsync()
    {
        var list = await _bills.GetByUserIdAsync(_ctx.ActingUserId);
        return list.Select(b => Map(b, null)).ToList();
    }

    public async Task<List<AdminBillPaymentDto>> GetAllPaymentsAsync()
    {
        var list = await _bills.GetAllWithUserAsync();
        return list.Select(b => new AdminBillPaymentDto(
            b.Id,
            b.User?.FullName ?? "—",
            b.User?.Email ?? "—",
            b.BillerName,
            b.SubscriberNo,
            b.Amount,
            b.CreatedAt)).ToList();
    }

    // Son ödeme tarihi: dönemin (ayın) son günü.
    private static DateTime DueDate(string period)
    {
        var parts = period.Split('-');
        var year = int.Parse(parts[0]);
        var month = int.Parse(parts[1]);
        var lastDay = DateTime.DaysInMonth(year, month);
        return new DateTime(year, month, lastDay, 0, 0, 0, DateTimeKind.Utc);
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];

    private static BillPaymentDto Map(BillPayment b, string? accountIban) =>
        new(b.Id, b.BillerName, b.Category.ToString(), b.SubscriberNo, b.Period, b.Amount, accountIban, b.CreatedAt);
}
