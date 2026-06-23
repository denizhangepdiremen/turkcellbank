using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Transactions.Dtos;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Transactions;

public class TransferApprovalService : ITransferApprovalService
{
    private readonly IPendingTransferRepository _pending;
    private readonly IAccountRepository _accounts;
    private readonly ITransactionService _transactionService;
    private readonly ICurrentUserService _currentUser;
    private readonly IOperationContext _ctx;

    public TransferApprovalService(
        IPendingTransferRepository pending,
        IAccountRepository accounts,
        ITransactionService transactionService,
        ICurrentUserService currentUser,
        IOperationContext ctx)
    {
        _pending = pending;
        _accounts = accounts;
        _transactionService = transactionService;
        _currentUser = currentUser;
        _ctx = ctx;
    }

    // Şube çalışanı tarafından (impersonate edilmiş bağlamda) çağrılır.
    public async Task CreatePendingAsync(TransferRequest request)
    {
        var from = await _accounts.GetByIdAsync(request.FromAccountId);
        if (from is null || from.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Hesap bulunamadı.");
        if (!from.IsActive)
            throw new BusinessException("Hesap kapalı.");

        await _pending.AddAsync(new PendingTransfer
        {
            Id = Guid.NewGuid(),
            CustomerUserId = _ctx.ActingUserId,
            FromAccountId = from.Id,
            FromIban = from.Iban,
            ToIban = request.ToIban.Replace(" ", "").ToUpperInvariant(),
            Amount = request.Amount,
            Description = request.Description,
            Status = TransferStatus.Pending,
            RequestedByEmployeeId = _ctx.PerformedByEmployeeId ?? Guid.Empty,
            CreatedAt = DateTime.UtcNow,
        });
    }

    public async Task<List<PendingTransferDto>> GetPendingAsync()
    {
        var list = await _pending.GetByStatusWithCustomerAsync(TransferStatus.Pending);
        return list.Select(t => new PendingTransferDto(
            t.Id,
            t.Customer?.FullName ?? "—",
            t.FromIban,
            t.ToIban,
            t.Amount,
            t.Description,
            t.CreatedAt)).ToList();
    }

    public async Task<TransactionDto> ApproveAsync(Guid id, string? note)
    {
        var pt = await LoadPendingForDecision(id);

        // Onay: müşteri adına havaleyi gerçekleştir (TransactionService yeniden
        // doğrular, parayı taşır ve Şube kanalı + çalışan damgasıyla kaydeder).
        _ctx.ActOnBehalfOf(pt.CustomerUserId, pt.RequestedByEmployeeId);
        var tx = await _transactionService.TransferAsync(
            new TransferRequest(pt.FromAccountId, pt.ToIban, pt.Amount, pt.Description));

        Decide(pt, TransferStatus.Approved, note);
        await _pending.SaveChangesAsync();
        return tx;
    }

    public async Task RejectAsync(Guid id, string? note)
    {
        var pt = await LoadPendingForDecision(id);
        Decide(pt, TransferStatus.Rejected, note);
        await _pending.SaveChangesAsync();
    }

    // Onay/red ortak: havaleyi getir + durum/rol kontrolü.
    private async Task<PendingTransfer> LoadPendingForDecision(Guid id)
    {
        var pt = await _pending.GetByIdAsync(id)
            ?? throw new NotFoundException("Bekleyen havale bulunamadı.");

        if (pt.Status != TransferStatus.Pending)
            throw new BusinessException("Bu havale onay beklemiyor.");

        // Yüksek tutarlı havale onayı yalnızca şube müdürünündür.
        if (_currentUser.Role != nameof(UserRole.BranchManager))
            throw new BusinessException("Bu havale yalnızca şube müdürü onayına tabidir.");

        return pt;
    }

    private void Decide(PendingTransfer pt, TransferStatus status, string? note)
    {
        pt.Status = status;
        pt.DecidedByUserId = _currentUser.UserId;
        pt.DecidedAt = DateTime.UtcNow;
        pt.DecisionNote = note?.Trim() ?? string.Empty;
    }
}
