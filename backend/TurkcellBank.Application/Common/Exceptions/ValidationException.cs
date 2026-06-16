namespace TurkcellBank.Application.Common.Exceptions;

/// <summary>
/// Giriş verisi doğrulamadan geçemediğinde fırlatılır.
/// Hata mesajlarını bir liste olarak taşır; global middleware bunu
/// HTTP 400 + Response Wrapper'ın "errors" alanına çevirir.
/// </summary>
public class ValidationException : Exception
{
    public List<string> Errors { get; }

    public ValidationException(List<string> errors)
        : base("Doğrulama hatası")
    {
        Errors = errors;
    }
}
