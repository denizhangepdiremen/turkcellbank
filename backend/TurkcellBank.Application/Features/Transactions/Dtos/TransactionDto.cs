namespace TurkcellBank.Application.Features.Transactions.Dtos;

/// <summary>
/// Bir hesabın geçmişindeki tek işlem (o hesabın bakış açısıyla).
///  - Direction: "In" (gelen/yatan) ya da "Out" (giden)
///  - CounterpartyIban: karşı taraf (deposit'te null)
/// </summary>
public record TransactionDto(
    Guid Id,
    string Type,
    string Direction,
    decimal Amount,
    string? CounterpartyIban,
    string? Description,
    DateTime CreatedAt);
