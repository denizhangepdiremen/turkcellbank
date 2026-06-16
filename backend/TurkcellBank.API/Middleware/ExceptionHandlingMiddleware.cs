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
        // Hata tipine göre uygun HTTP kodu + mesaj belirle
        var (statusCode, message) = ex switch
        {
            NotFoundException => (HttpStatusCode.NotFound, ex.Message),
            BusinessException => (HttpStatusCode.BadRequest, ex.Message),
            // Beklenmeyen hatalarda detayı kullanıcıya sızdırma (güvenlik)
            _ => (HttpStatusCode.InternalServerError, "Beklenmeyen bir hata oluştu."),
        };

        // Beklenmeyen hataları Error, bilinen iş hatalarını Warning olarak logla
        if (statusCode == HttpStatusCode.InternalServerError)
            _logger.LogError(ex, "Beklenmeyen hata oluştu");
        else
            _logger.LogWarning("İşlem hatası: {Message}", ex.Message);

        var response = ApiResponse<object?>.Fail(message);

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });

        await context.Response.WriteAsync(json);
    }
}
