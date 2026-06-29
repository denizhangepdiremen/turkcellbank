using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Ödenmiş bir fatura kaydı. Tutar, faturayı sorgulayan kullanıcının seçtiği
/// hesabından düşülür; ayrıca bir <see cref="Transaction"/> (BillPayment) yazılır.
///
/// Kurum bilgisi (kod/ad/kategori) kayda gömülü (denormalize) tutulur — kurum
/// kataloğu kod içinde sabit referans veridir, ayrı tablo yoktur.
///
/// Aynı (kurum + abone no + dönem) için tek başarılı ödeme olur; tekrar
/// sorgulandığında "ödenmiş" görünür.
/// </summary>
public class BillPayment
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; } // ödeyen (admin listesinde gösterilir)

    public Guid? AccountId { get; set; } // parası çekilen hesap

    public BillCategory Category { get; set; }
    public string BillerCode { get; set; } = string.Empty; // kurum kodu (katalogdan)
    public string BillerName { get; set; } = string.Empty; // kurum adı (denormalize)
    public string SubscriberNo { get; set; } = string.Empty; // abone/tesisat no
    public string Period { get; set; } = string.Empty; // dönem "YYYY-MM"

    public decimal Amount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // İşlem kanalı + adına işlemde şube çalışanı (denetim/izlenebilirlik için)
    public Channel Channel { get; set; } = Channel.Internet;
    public Guid? PerformedByEmployeeId { get; set; }
}
