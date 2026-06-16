namespace TurkcellBank.Application.Common;

/// <summary>
/// Tüm API cevaplarının sarıldığı tek tip zarf (Response Wrapper).
/// Frontend her endpoint'i aynı yapıda işleyebilsin diye kullanılır.
///
/// T = data alanının tipi (generic). Örn. ApiResponse&lt;AccountDto&gt;.
/// </summary>
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }
    public List<string>? Errors { get; set; }

    /// <summary>Başarılı cevap üretir.</summary>
    public static ApiResponse<T> SuccessResponse(T data, string? message = null)
        => new() { Success = true, Data = data, Message = message };

    /// <summary>Hatalı cevap üretir (opsiyonel hata listesiyle).</summary>
    public static ApiResponse<T> Fail(string message, List<string>? errors = null)
        => new() { Success = false, Message = message, Errors = errors };
}
