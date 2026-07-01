using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.CreditCards.Dtos;

/// <summary>
/// Kredi kartı başvuru formu. Gelir/gider profili kredi başvurusuyla benzerdir;
/// limit motordan atanır (talep tutarı yoktur). Müşteri kesim gününü seçer.
/// </summary>
public record CreditCardApplicationRequest(
    string NationalId,
    int Age,
    MaritalStatus MaritalStatus,
    int ChildrenCount,
    HousingStatus HousingStatus,
    decimal Income,
    decimal MonthlyExpenses,
    int EmploymentMonths,
    string Profession,
    int StatementDay); // her ayın kesim günü (1..28)

/// <summary>Müşteriye dönülen kredi kartı bilgisi (kullanılabilir limit dahil).</summary>
public record CreditCardDto(
    Guid Id,
    string MaskedCardNumber,
    int ExpiryMonth,
    int ExpiryYear,
    string Status,
    decimal CreditLimit,
    decimal CurrentDebt,
    decimal AvailableLimit,
    int StatementDay,
    DateTime NextStatementDate,
    bool OnlineShoppingEnabled,
    int Score,
    string? AiReason,
    DateTime OpenedAt);

/// <summary>Admin/onay listesi için: başvuran bilgisiyle.</summary>
public record AdminCreditCardDto(
    Guid Id,
    string HolderName,
    string HolderEmail,
    string MaskedCardNumber,
    string Status,
    decimal CreditLimit,
    int Score,
    string? AiReason,
    DateTime OpenedAt,
    DateTime? DecidedAt);

/// <summary>Dönem ekstresi.</summary>
public record CreditCardStatementDto(
    Guid Id,
    Guid CreditCardId,
    DateTime PeriodStart,
    DateTime PeriodEnd,
    DateTime StatementDate,
    DateTime DueDate,
    decimal TotalDue,
    decimal MinimumPayment,
    decimal PaidAmount,
    decimal RemainingAmount,
    string Status);

/// <summary>Kart hareketi / ekstre kalemi.</summary>
public record CreditCardTransactionDto(
    Guid Id,
    string Type,
    decimal Amount,
    string Description,
    int? InstallmentNo,
    int? InstallmentCount,
    Guid? StatementId,
    DateTime CreatedAt);

/// <summary>Kredi kartı borcu ödeme isteği (belirli ekstre veya genel borç için).</summary>
public record PayCreditCardRequest(
    Guid CreditCardId,
    Guid SourceAccountId,
    decimal Amount);

/// <summary>
/// Sanal POS üzerinden kredi kartıyla harcama isteği (Payments akışından çağrılır).
/// </summary>
public record CreditCardSpendRequest(
    Guid CreditCardId,
    decimal Amount,
    int Installments,
    string ThreeDSCode,
    string? Description);
