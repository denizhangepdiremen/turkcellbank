namespace TurkcellBank.Application.Features.Management.Dtos;

/// <summary>
/// Banka (müdür) tarafından hesap dondurma isteği. Sebep opsiyoneldir; müşteriye
/// bildirimde ve denetim kaydında gösterilir.
/// </summary>
public record BankFreezeRequest(string? Reason);
