namespace TurkcellBank.Application.Common.Exceptions;

/// <summary>
/// İş kuralı ihlallerinde fırlatılır (örn. yetersiz bakiye, kapalı hesap).
/// Global middleware bunu HTTP 400'e çevirir.
/// </summary>
public class BusinessException : Exception
{
    public BusinessException(string message) : base(message)
    {
    }
}
