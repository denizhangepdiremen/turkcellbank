using TurkcellBank.Application.Features.PaymentOrders.Dtos;

namespace TurkcellBank.Application.Features.PaymentOrders;

public interface IPaymentOrderService
{
    Task<List<PaymentOrderDto>> GetMineAsync();
    Task<PaymentOrderDto> CreateAsync(CreatePaymentOrderRequest request);
    Task<PaymentOrderDto> SetActiveAsync(Guid id, bool isActive);
    Task DeleteAsync(Guid id);
}
