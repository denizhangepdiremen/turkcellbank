using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Org.Dtos;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;
// "Branch" hem Features.Branch namespace'i hem Domain entity olduğundan alias
using BranchEntity = TurkcellBank.Domain.Entities.Branch;

namespace TurkcellBank.Application.Features.Org;

/// <summary>
/// Organizasyon görünümü: isteği yapan yöneticinin bir alt kademesini ve onay
/// bekleyen iş yükünü (kendi bandı) özetler. Görünürlük zinciri:
/// şube müdürü→çalışanlar, il müdürü→şube müdürleri, direktör→il müdürleri.
/// </summary>
public class OrgService : IOrgService
{
    private readonly IUserRepository _users;
    private readonly IBranchRepository _branches;
    private readonly ILoanRepository _loans;
    private readonly ICardRepository _cards;
    private readonly IPendingTransferRepository _transfers;
    private readonly ICurrentUserService _currentUser;

    public OrgService(
        IUserRepository users,
        IBranchRepository branches,
        ILoanRepository loans,
        ICardRepository cards,
        IPendingTransferRepository transfers,
        ICurrentUserService currentUser)
    {
        _users = users;
        _branches = branches;
        _loans = loans;
        _cards = cards;
        _transfers = transfers;
        _currentUser = currentUser;
    }

    public async Task<OrgViewDto> GetTeamAsync()
    {
        var me = await _users.GetByIdAsync(_currentUser.UserId)
            ?? throw new NotFoundException("Kullanıcı bulunamadı.");

        var users = await _users.GetAllAsync();
        var branches = await _branches.GetAllAsync();
        var branchName = branches.ToDictionary(b => b.Id, b => b.Name);

        // Onay bekleyen iş yükü (kendi bandı)
        var pendingLoans = await _loans.GetByStatusWithUserAsync(LoanStatus.PendingApproval);
        var myBandLoans = pendingLoans.Count(l => l.RequiredApproverRole == me.Role);

        OrgMemberDto ToMember(User u) =>
            new(u.FullName, u.Email, u.Role.ToString(),
                u.BranchId is Guid bid && branchName.TryGetValue(bid, out var n) ? n : null,
                u.City);

        return me.Role switch
        {
            UserRole.BranchManager => await BuildBranchManagerViewAsync(me, users, branchName, myBandLoans, ToMember),
            UserRole.ProvincialManager => BuildProvincialManagerView(me, users, branches, myBandLoans, ToMember),
            UserRole.Director => BuildDirectorView(users, branches, myBandLoans, ToMember),
            _ => throw new BusinessException("Bu görünüme yetkiniz yok."),
        };
    }

    private async Task<OrgViewDto> BuildBranchManagerViewAsync(
        User me, List<User> users, Dictionary<Guid, string> branchName,
        int myBandLoans, Func<User, OrgMemberDto> toMember)
    {
        var members = users
            .Where(u => u.Role == UserRole.BranchEmployee && u.BranchId == me.BranchId)
            .Select(toMember).ToList();

        var pendingCards = (await _cards.GetAllWithUserAsync()).Count(c => c.Status == CardStatus.Pending);
        var pendingTransfers = (await _transfers.GetByStatusWithCustomerAsync(TransferStatus.Pending)).Count;

        var name = me.BranchId is Guid bid && branchName.TryGetValue(bid, out var n) ? n : "Şubem";

        return new OrgViewDto(
            name,
            me.City ?? "—",
            members,
            new List<OrgStatDto>
            {
                new("Şube çalışanı", members.Count),
                new("Bekleyen kredi (onayım)", myBandLoans),
                new("Bekleyen kart", pendingCards),
                new("Bekleyen havale", pendingTransfers),
            });
    }

    private static OrgViewDto BuildProvincialManagerView(
        User me, List<User> users, List<BranchEntity> branches,
        int myBandLoans, Func<User, OrgMemberDto> toMember)
    {
        var members = users
            .Where(u => u.Role == UserRole.BranchManager && u.City == me.City)
            .Select(toMember).ToList();

        var cityBranches = branches.Count(b => b.City == me.City);

        return new OrgViewDto(
            $"İl: {me.City}",
            "İlinizdeki şube müdürleri",
            members,
            new List<OrgStatDto>
            {
                new("Şube sayısı", cityBranches),
                new("Şube müdürü", members.Count),
                new("Bekleyen kredi (onayım)", myBandLoans),
            });
    }

    private static OrgViewDto BuildDirectorView(
        List<User> users, List<BranchEntity> branches,
        int myBandLoans, Func<User, OrgMemberDto> toMember)
    {
        var members = users
            .Where(u => u.Role == UserRole.ProvincialManager)
            .Select(toMember).ToList();

        return new OrgViewDto(
            "Tüm Banka",
            "İl müdürleri ve genel durum",
            members,
            new List<OrgStatDto>
            {
                new("İl müdürü", members.Count),
                new("Toplam şube", branches.Count),
                new("Bekleyen kredi (onayım)", myBandLoans),
            });
    }
}
