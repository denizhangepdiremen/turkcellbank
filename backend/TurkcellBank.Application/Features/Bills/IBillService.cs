using TurkcellBank.Application.Features.Bills.Dtos;

namespace TurkcellBank.Application.Features.Bills;

public interface IBillService
{
    /// <summary>Fatura ödenebilen kurum kataloğu.</summary>
    List<BillerDto> GetBillers();

    /// <summary>Faturayı sorgular (güncel tutar + son ödeme tarihi).</summary>
    Task<BillInquiryDto> InquireAsync(BillInquiryRequest request);

    /// <summary>Faturayı seçilen hesaptan öder.</summary>
    Task<BillPaymentDto> PayAsync(PayBillRequest request);

    /// <summary>Fatura ödeme geçmişim.</summary>
    Task<List<BillPaymentDto>> GetMyPaymentsAsync();

    /// <summary>Tüm fatura ödemeleri (admin/personel görünümü).</summary>
    Task<List<AdminBillPaymentDto>> GetAllPaymentsAsync();
}
