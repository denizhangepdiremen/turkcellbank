namespace TurkcellBank.Domain.Enums;

/// <summary>Döviz/altın işlem yönü: müşteri alıyor mu (Buy) satıyor mu (Sell)?</summary>
public enum FxTradeSide
{
    Buy,  // müşteri döviz/altın alır (TL'den çıkar, dövize geçer)
    Sell, // müşteri döviz/altın satar (dövizden çıkar, TL'ye geçer)
}
