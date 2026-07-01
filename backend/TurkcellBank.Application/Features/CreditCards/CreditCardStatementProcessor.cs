using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Notifications;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.CreditCards;

/// <summary>
/// Ekstre kesimi işlemcisi (arka plan bağlamı — istek/kullanıcı bağlamı yoktur).
/// Kesim günü gelen her kart için: dönemi faturalar (her aktif taksit planından bir
/// taksit), dönem ekstresini oluşturur, asgari ödeme ve son ödeme tarihini hesaplar,
/// kart hareketlerini yazar ve bir sonraki kesim tarihini bir ay ileri alır.
/// Tüm değişiklikler tek <c>SaveChanges</c> ile atomik; bildirimler kayıt sonrası
/// gönderilir (kayıt akışını yarıda kesmesin).
/// </summary>
public class CreditCardStatementProcessor : ICreditCardStatementProcessor
{
    private readonly ICreditCardRepository _cards;
    private readonly INotificationService _notifications;
    private readonly CreditCardOptions _options;

    public CreditCardStatementProcessor(
        ICreditCardRepository cards,
        INotificationService notifications,
        CreditCardOptions options)
    {
        _cards = cards;
        _notifications = notifications;
        _options = options;
    }

    public async Task<int> ProcessDueAsync(DateTime nowUtc, CancellationToken ct = default)
    {
        var dueCards = await _cards.GetDueForStatementAsync(nowUtc);
        if (dueCards.Count == 0) return 0;

        var created = 0;
        var pending = new List<(Guid UserId, string Title, string Body)>();

        foreach (var card in dueCards)
        {
            if (ct.IsCancellationRequested) break;

            var statementDate = card.NextStatementDate;
            var periodStart = statementDate.AddMonths(-1);
            var statementId = Guid.NewGuid();

            var plans = await _cards.GetActivePlansAsync(card.Id);
            var billable = plans
                .Where(p => p.CreatedAt < statementDate && p.InstallmentsBilled < p.InstallmentCount)
                .OrderBy(p => p.CreatedAt)
                .ToList();

            decimal totalDue = 0m;
            foreach (var plan in billable)
            {
                var no = plan.InstallmentsBilled + 1;
                // Son taksit yuvarlama farkını yutar
                var amount = no == plan.InstallmentCount
                    ? plan.TotalAmount - plan.InstallmentAmount * (plan.InstallmentCount - 1)
                    : plan.InstallmentAmount;

                plan.InstallmentsBilled = no;

                _cards.AddTransaction(new CreditCardTransaction
                {
                    Id = Guid.NewGuid(),
                    CreditCardId = card.Id,
                    Type = plan.InstallmentCount > 1
                        ? CreditCardTxType.Installment
                        : CreditCardTxType.Purchase,
                    Amount = amount,
                    Description = plan.Description,
                    InstallmentPlanId = plan.Id,
                    InstallmentNo = no,
                    StatementId = statementId,
                    CreatedAt = nowUtc,
                });

                totalDue += amount;
            }

            if (totalDue > 0m)
            {
                var minPay = Math.Round(totalDue * _options.MinimumPaymentRatio, 2, MidpointRounding.AwayFromZero);
                if (minPay < 1m || minPay > totalDue) minPay = totalDue; // çok küçük borçta tamamı asgari

                _cards.AddStatement(new CreditCardStatement
                {
                    Id = statementId,
                    CreditCardId = card.Id,
                    PeriodStart = periodStart,
                    PeriodEnd = statementDate,
                    StatementDate = statementDate,
                    DueDate = statementDate.AddDays(card.DueDayOffset),
                    TotalDue = totalDue,
                    MinimumPayment = minPay,
                    PaidAmount = 0m,
                    RemainingAmount = totalDue,
                    Status = CreditCardStatementStatus.Due,
                    CreatedAt = nowUtc,
                });
                created++;

                pending.Add((card.UserId, "Ekstreniz kesildi",
                    $"Dönem borcu {totalDue:N2} ₺, asgari ödeme {minPay:N2} ₺, " +
                    $"son ödeme tarihi {statementDate.AddDays(card.DueDayOffset):dd.MM.yyyy}."));
            }

            // Kesim gerçekleşti; bir sonraki kesimi bir ay ileri al (borç olmasa da).
            card.NextStatementDate = statementDate.AddMonths(1);
        }

        await _cards.SaveChangesAsync();

        // Bildirimler kayıt sonrası (akışı yarıda kesmesin)
        foreach (var n in pending)
        {
            if (ct.IsCancellationRequested) break;
            await _notifications.NotifyAsync(n.UserId, n.Title, n.Body);
        }

        return created;
    }
}
