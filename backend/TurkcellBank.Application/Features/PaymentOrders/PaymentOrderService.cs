using FluentValidation;
using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Bills;
using TurkcellBank.Application.Features.PaymentOrders.Dtos;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.PaymentOrders;

public class PaymentOrderService : IPaymentOrderService
{
    private readonly IPaymentOrderRepository _orders;
    private readonly IAccountRepository _accounts;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreatePaymentOrderRequest> _validator;

    public PaymentOrderService(
        IPaymentOrderRepository orders,
        IAccountRepository accounts,
        ICurrentUserService currentUser,
        IValidator<CreatePaymentOrderRequest> validator)
    {
        _orders = orders;
        _accounts = accounts;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<List<PaymentOrderDto>> GetMineAsync()
    {
        var list = await _orders.GetByUserIdAsync(_currentUser.UserId);
        // IBAN gösterimi için kaynak hesapları topluca çek
        var accounts = await _accounts.GetByUserIdAsync(_currentUser.UserId);
        var ibanById = accounts.ToDictionary(a => a.Id, a => a.Iban);
        return list.Select(o => Map(o, ibanById.GetValueOrDefault(o.SourceAccountId, "—"))).ToList();
    }

    public async Task<PaymentOrderDto> CreateAsync(CreatePaymentOrderRequest request)
    {
        var validation = await _validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new Common.Exceptions.ValidationException(
                validation.Errors.Select(e => e.ErrorMessage).ToList());

        // Kaynak hesap işlemin sahibine mi ait? (varlığı sızdırma → NotFound)
        var account = await _accounts.GetByIdAsync(request.SourceAccountId);
        if (account is null || account.UserId != _currentUser.UserId)
            throw new NotFoundException("Hesap bulunamadı.");
        if (!account.IsActive)
            throw new BusinessException("Seçilen hesap kapalı.");

        var type = Enum.Parse<PaymentOrderType>(request.Type);

        var order = new PaymentOrder
        {
            Id = Guid.NewGuid(),
            UserId = _currentUser.UserId,
            Type = type,
            Name = request.Name.Trim(),
            SourceAccountId = account.Id,
            DayOfMonth = request.DayOfMonth,
            NextRunDate = PaymentOrderSchedule.NextRun(request.DayOfMonth, DateTime.UtcNow),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        if (type == PaymentOrderType.AutoBill)
        {
            var biller = BillerCatalog.Find(request.BillerCode!)
                ?? throw new NotFoundException("Kurum bulunamadı.");
            order.Category = biller.Category;
            order.BillerCode = biller.Code;
            order.BillerName = biller.Name;
            order.SubscriberNo = request.SubscriberNo;
        }
        else // RecurringTransfer
        {
            var iban = request.TargetIban!.Replace(" ", "").ToUpperInvariant();
            var target = await _accounts.GetByIbanAsync(iban);
            if (target is null)
                throw new BusinessException("Alıcı hesap bulunamadı.");
            if (target.Id == account.Id)
                throw new BusinessException("Aynı hesaba talimat verilemez.");

            order.TargetIban = iban;
            order.TargetName = string.IsNullOrWhiteSpace(request.TargetName) ? null : request.TargetName.Trim();
            order.Amount = request.Amount;
        }

        await _orders.AddAsync(order);
        return Map(order, account.Iban);
    }

    public async Task<PaymentOrderDto> SetActiveAsync(Guid id, bool isActive)
    {
        var order = await _orders.GetByIdAsync(id);
        if (order is null || order.UserId != _currentUser.UserId)
            throw new NotFoundException("Talimat bulunamadı.");

        order.IsActive = isActive;
        // Yeniden aktifleştirilirken vadesi geçmişse bir sonraki güne ötele
        if (isActive && order.NextRunDate < DateTime.UtcNow.Date)
            order.NextRunDate = PaymentOrderSchedule.NextRun(order.DayOfMonth, DateTime.UtcNow);

        await _orders.SaveChangesAsync();

        var account = await _accounts.GetByIdAsync(order.SourceAccountId);
        return Map(order, account?.Iban ?? "—");
    }

    public async Task DeleteAsync(Guid id)
    {
        var order = await _orders.GetByIdAsync(id);
        if (order is null || order.UserId != _currentUser.UserId)
            throw new NotFoundException("Talimat bulunamadı.");

        await _orders.DeleteAsync(order);
    }

    private static PaymentOrderDto Map(PaymentOrder o, string sourceIban) =>
        new(
            o.Id,
            o.Type.ToString(),
            o.Name,
            o.SourceAccountId,
            sourceIban,
            o.DayOfMonth,
            o.NextRunDate,
            o.IsActive,
            o.LastRunAt,
            o.LastStatus,
            o.Category?.ToString(),
            o.BillerName,
            o.SubscriberNo,
            o.TargetIban,
            o.TargetName,
            o.Amount,
            o.CreatedAt);
}
