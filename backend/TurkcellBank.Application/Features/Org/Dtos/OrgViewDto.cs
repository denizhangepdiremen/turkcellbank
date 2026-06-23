namespace TurkcellBank.Application.Features.Org.Dtos;

/// <summary>Organizasyon görünümünde bir alt kademe personeli.</summary>
public record OrgMemberDto(
    string FullName,
    string Email,
    string Role,
    string? BranchName,
    string? City);

/// <summary>Basit rapor satırı (etiket + sayı).</summary>
public record OrgStatDto(string Label, int Value);

/// <summary>
/// Yöneticinin organizasyon görünümü: bir alt kademedeki ekip + basit istatistikler.
/// İçerik isteği yapan rolün kapsamına göre doldurulur (şube/il/genel).
/// </summary>
public record OrgViewDto(
    string Title,
    string Subtitle,
    List<OrgMemberDto> Members,
    List<OrgStatDto> Stats);
