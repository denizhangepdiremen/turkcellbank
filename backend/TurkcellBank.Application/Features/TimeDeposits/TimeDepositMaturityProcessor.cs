using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Notifications;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.TimeDeposits;

/// <summary>
/// Vadesi dolmuş mevduatları işler: anapara + net faizi kaynak hesaba geri yatırır,
/// işlemi <see cref="Channel.Automatic"/> ile damgalar, müşteriye bildirim ve
/// denetim kaydı yazar. Çalıştırma istek bağlamı dışındadır.
/// </summary>
public class TimeDepositMaturityProcessor : ITimeDepositMaturityProcessor
{
    private readonly ITimeDepositRepository _deposits;
    private readonly IAccountRepository _accounts;
    private readonly ITransactionRepository _transactions;
    private readonly INotificationService _notifications;
    private readonly IAuditLogRepository _audit;

    public TimeDepositMaturityProcessor(
        ITimeDepositRepository deposits,
        IAccountRepository accounts,
        ITransactionRepository transactions,
        INotificationService notifications,
        IAuditLogRepository audit)
    {
        _deposits = deposits;
        _accounts = accounts;
        _transactions = transactions;
        _notifications = notifications;
        _audit = audit;
    }

    public async Task<int> ProcessMaturedAsync(DateTime nowUtc, CancellationToken ct = default)
    {
        var matured = await _deposits.GetMaturedActiveAsync(nowUtc);
        var processed = 0;

        foreach (var deposit in matured)
        {
            if (ct.IsCancellationRequested) break;

            var account = await _accounts.GetByIdAsync(deposit.SourceAccountId);
            // Hesap kapalıysa bu tıkta işleme; bir sonraki tıkta tekrar denenir.
            if (account is null || !account.IsActive)
                continue;

            var payout = deposit.Principal + deposit.NetInterest;

            account.Balance += payout;
            deposit.Status = TimeDepositStatus.Matured;
            deposit.ClosedAt = nowUtc;

            var tx = new Transaction
            {
                Id = Guid.NewGuid(),
                Type = TransactionType.TimeDepositMaturity,
                ToAccountId = account.Id,
                ToIban = account.Iban,
                Amount = payout,
                Description = "Vadeli getiri",
                CreatedAt = nowUtc,
                Channel = Channel.Automatic,
            };

            // anapara + faiz iadesi + mevduat durumu birlikte (atomik) kaydolur
            await _transactions.AddAsync(tx);

            await _notifications.NotifyAsync(
                deposit.UserId,
                "Vadeli Mevduat",
                $"Vadeli mevduatınız doldu: anapara {deposit.Principal:N2} TL + net faiz " +
                $"{deposit.NetInterest:N2} TL = {payout:N2} TL hesabınıza yatırıldı.");

            await _audit.AddAsync(new AuditLog
            {
                Id = Guid.NewGuid(),
                ActorUserId = deposit.UserId,
                ActorRole = "Customer",
                Action = "Vade dolumu",
                Detail = $"{deposit.TermDays} günlük vadeli mevduat doldu — {payout:N2} TL iade edildi.",
                CreatedAt = nowUtc,
            });

            processed++;
        }

        return processed;
    }
}
