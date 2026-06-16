namespace TurkcellBank.Application.Common.Exceptions;

/// <summary>
/// İstenen kayıt bulunamadığında fırlatılır (örn. olmayan hesap).
/// Global middleware bunu HTTP 404'e çevirir.
/// </summary>
public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message)
    {
    }
}
