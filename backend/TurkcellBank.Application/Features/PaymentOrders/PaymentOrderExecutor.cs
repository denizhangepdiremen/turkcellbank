using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Bills;
using TurkcellBank.Application.Features.Notifications;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.PaymentOrders;

/// <summary>
/// Talimat çalıştırma mantığı. Para hareketleri mevcut desenle (izlenen hesap
/// bakiyesi + Transaction kaydı, tek SaveChanges) yapılır ve <see cref="Channel.Automatic"/>
/// ile damgalanır. Çalıştırma istek bağlamı dışında olduğundan denetim kaydı
/// doğrudan repository üzerinden, aktör olarak talimat sahibi müşteriyle yazılır.
/// </summary>
public class PaymentOrderExecutor : IPaymentOrderExecutor
{
    private readonly IPaymentOrderRepository _orders;
    private readonly IAccountRepository _accounts;
    private readonly ITransactionRepository _transactions;
    private readonly IBillPaymentRepository _bills;
    private readonly INotificationService _notifications;
    private readonly IAuditLogRepository _audit;

    public PaymentOrderExecutor(
        IPaymentOrderRepository orders,
        IAccountRepository accounts,
        ITransactionRepository transactions,
        IBillPaymentRepository bills,
        INotificationService notifications,
        IAuditLogRepository audit)
    {
        _orders = orders;
        _accounts = accounts;
        _transactions = transactions;
        _bills = bills;
        _notifications = notifications;
        _audit = audit;
    }

    public async Task<int> ExecuteDueAsync(DateTime nowUtc, CancellationToken ct = default)
    {
        var due = await _orders.GetDueAsync(nowUtc);
        var processed = 0;

        foreach (var order in due)
        {
            if (ct.IsCancellationRequested) break;

            string status;
            try
            {
                status = order.Type == PaymentOrderType.AutoBill
                    ? await RunAutoBillAsync(order)
                    : await RunRecurringTransferAsync(order);
            }
            catch (Exception ex)
            {
                status = "Hata: işlem tamamlanamadı";
                await NotifyAsync(order, $"“{order.Name}” talimatı çalıştırılamadı: {ex.Message}");
            }

            // Sonucu işle + bir sonraki aya ötele (her durumda; tekrar denemeyi engeller)
            order.LastRunAt = nowUtc;
            order.LastStatus = status;
            order.NextRunDate = PaymentOrderSchedule.AfterRun(order.DayOfMonth, nowUtc);
            await _orders.SaveChangesAsync();

            await WriteAuditAsync(order, status);
            processed++;
        }

        return processed;
    }

    private async Task<string> RunAutoBillAsync(PaymentOrder order)
    {
        var account = await _accounts.GetByIdAsync(order.SourceAccountId);
        if (account is null || !account.IsActive || account.IsFrozen)
        {
            await NotifyAsync(order, $"“{order.Name}” otomatik fatura ödenemedi: kaynak hesap uygun değil.");
            return "Hesap uygun değil";
        }

        var period = BillerCatalog.CurrentPeriod();
        if (await _bills.IsPaidAsync(order.BillerCode!, order.SubscriberNo!, period))
            return "Bu dönem zaten ödenmiş";

        var biller = BillerCatalog.Find(order.BillerCode!);
        if (biller is null)
            return "Kurum bulunamadı";

        var amount = BillerCatalog.ComputeAmount(biller.Code, order.SubscriberNo!, period, biller.Category);

        if (account.Balance < amount)
        {
            await NotifyAsync(order,
                $"“{order.Name}” otomatik fatura ödenemedi: yetersiz bakiye (borç {amount:N2} TL).");
            return "Yetersiz bakiye";
        }

        account.Balance -= amount;

        var billPayment = new BillPayment
        {
            Id = Guid.NewGuid(),
            UserId = order.UserId,
            AccountId = account.Id,
            Category = biller.Category,
            BillerCode = biller.Code,
            BillerName = biller.Name,
            SubscriberNo = order.SubscriberNo!,
            Period = period,
            Amount = amount,
            CreatedAt = DateTime.UtcNow,
            Channel = Channel.Automatic,
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
            Channel = Channel.Automatic,
        };

        await _bills.AddAsync(billPayment);
        await _transactions.AddAsync(tx);

        await NotifyAsync(order,
            $"“{order.Name}” otomatik fatura ödendi: {biller.Name} · {amount:N2} TL.");
        return "Başarılı";
    }

    private async Task<string> RunRecurringTransferAsync(PaymentOrder order)
    {
        var amount = order.Amount!.Value;

        var from = await _accounts.GetByIdAsync(order.SourceAccountId);
        if (from is null || !from.IsActive || from.IsFrozen)
        {
            await NotifyAsync(order, $"“{order.Name}” düzenli havale yapılamadı: kaynak hesap uygun değil.");
            return "Hesap uygun değil";
        }

        var to = await _accounts.GetByIbanAsync(order.TargetIban!);
        if (to is null || !to.IsActive)
        {
            await NotifyAsync(order, $"“{order.Name}” düzenli havale yapılamadı: alıcı hesap bulunamadı.");
            return "Alıcı hesap bulunamadı";
        }
        if (to.IsFrozen)
        {
            await NotifyAsync(order, $"“{order.Name}” düzenli havale yapılamadı: alıcı hesap dondurulmuş.");
            return "Alıcı hesap dondurulmuş";
        }

        if (from.Balance < amount)
        {
            await NotifyAsync(order,
                $"“{order.Name}” düzenli havale yapılamadı: yetersiz bakiye ({amount:N2} TL).");
            return "Yetersiz bakiye";
        }

        from.Balance -= amount;
        to.Balance += amount;

        var tx = new Transaction
        {
            Id = Guid.NewGuid(),
            Type = TransactionType.Transfer,
            FromAccountId = from.Id,
            FromIban = from.Iban,
            ToAccountId = to.Id,
            ToIban = to.Iban,
            Amount = amount,
            Description = Truncate(order.Name, 20),
            CreatedAt = DateTime.UtcNow,
            Channel = Channel.Automatic,
        };

        await _transactions.AddAsync(tx);

        await NotifyAsync(order,
            $"“{order.Name}” düzenli havalesi yapıldı: {amount:N2} TL → ...{order.TargetIban![^4..]}.");
        return "Başarılı";
    }

    private Task NotifyAsync(PaymentOrder order, string body)
        => _notifications.NotifyAsync(order.UserId, "Düzenli Ödeme Talimatı", body);

    private Task WriteAuditAsync(PaymentOrder order, string status)
        => _audit.AddAsync(new AuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = order.UserId,
            ActorRole = "Customer",
            Action = "Otomatik ödeme",
            Detail = $"“{order.Name}” talimatı çalıştırıldı — sonuç: {status}.",
            CreatedAt = DateTime.UtcNow,
        });

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];
}
