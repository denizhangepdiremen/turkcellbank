namespace TurkcellBank.Application.Features.Loans.Dtos;

/// <summary>Tek bir taksit.</summary>
public record InstallmentDto(int No, DateTime DueDate, decimal Amount);

/// <summary>Onaylanan kredinin ödeme planı (eşit taksitli, basit faiz).</summary>
public record PaymentPlanDto(
    decimal MonthlyRate,
    decimal MonthlyPayment,
    decimal TotalPayment,
    List<InstallmentDto> Installments);
