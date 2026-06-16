using System.Net;
using System.Text.Json;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Common.Exceptions;

namespace TurkcellBank.API.Middleware;

/// <summary>
/// Global hata yakalama katmanı (middleware).
/// Tüm istekler bunun içinden geçer; bir yerde hata fırlarsa burada yakalanır,
/// loglanır ve kullanıcıya Response Wrapper formatında temiz bir cevap döner.
/// Böylece her controller'da tek tek try-catch yazmaya gerek kalmaz.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            // İsteği bir sonraki adıma (controller'a) ilet
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        // Hata tipine göre uygun HTTP kodu, mesaj ve (varsa) hata listesi belirle
        HttpStatusCode statusCode;
        string message;
        List<string>? errors = null;

        switch (ex)
        {
            case ValidationException ve:
                statusCode = HttpStatusCode.BadRequest;
                message = ve.Message;
                errors = ve.Errors; // doğrulama hatalarının tamamı
                break;
            case NotFoundException:
                statusCode = HttpStatusCode.NotFound;
                message = ex.Message;
                break;
            case BusinessException:
                statusCode = HttpStatusCode.BadRequest;
                message = ex.Message;
                break;
            default:
                // Beklenmeyen hatalarda detayı kullanıcıya sızdırma (güvenlik)
                statusCode = HttpStatusCode.InternalServerError;
                message = "Beklenmeyen bir hata oluştu.";
                break;
        }

        // Beklenmeyen hataları Error, bilinen iş hatalarını Warning olarak logla
        if (statusCode == HttpStatusCode.InternalServerError)
            _logger.LogError(ex, "Beklenmeyen hata oluştu");
        else
            _logger.LogWarning("İşlem hatası: {Message}", ex.Message);

        var response = ApiResponse<object?>.Fail(message, errors);

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });

        await context.Response.WriteAsync(json);
    }
}
