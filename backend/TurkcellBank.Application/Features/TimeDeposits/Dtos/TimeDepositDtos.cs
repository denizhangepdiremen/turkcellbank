namespace TurkcellBank.Application.Features.TimeDeposits.Dtos;

/// <summary>Sunulan vadeli mevduat ürünü (frontend ürün listesi için).</summary>
public record TimeDepositProductDto(int TermDays, decimal AnnualRate, string Label);

/// <summary>Vadeli mevduat açma isteği.</summary>
public record OpenTimeDepositRequest(Guid SourceAccountId, decimal Principal, int TermDays);

/// <summary>Vadeli mevduat kaydı (müşteri görünümü).</summary>
public record TimeDepositDto(
    Guid Id,
    Guid SourceAccountId,
    string SourceIban,
    decimal Principal,
    decimal AnnualRate,
    int TermDays,
    decimal GrossInterest,
    decimal WithholdingTax,
    decimal NetInterest,
    decimal MaturityAmount, // anapara + net faiz
    string Status,
    DateTime OpenedAt,
    DateTime MaturityDate,
    DateTime? ClosedAt);
