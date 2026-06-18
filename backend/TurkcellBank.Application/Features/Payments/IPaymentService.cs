using TurkcellBank.Application.Features.Payments.Dtos;

namespace TurkcellBank.Application.Features.Payments;

public interface IPaymentService
{
    // --- Müşteri ---
    Task<PaymentDto> PayAsync(PaymentRequest request);
    Task<List<PaymentDto>> GetMyPaymentsAsync();

    // --- Admin ---
    Task<List<AdminPaymentDto>> GetAllPaymentsAsync();
    Task<PaymentDto> RefundAsync(Guid id);
}
