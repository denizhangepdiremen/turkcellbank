using TurkcellBank.API.Middleware;
using TurkcellBank.Application;
using TurkcellBank.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// --- Servisler (DI konteyneri) ---

// Controller'lar (sonraki adımda eklenecek) için
builder.Services.AddControllers();

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Application katmanı: iş mantığı servisleri + validator'lar
builder.Services.AddApplication();

// Infrastructure katmanı: veritabanı (PostgreSQL + EF Core) bağlantısı
// Tek satırla; detaylar Infrastructure/DependencyInjection.cs içinde.
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

// --- HTTP pipeline ---

// Global hata yakalama: pipeline'ın EN BAŞINDA olmalı ki altındaki
// her şeyin (controller, middleware) hatalarını yakalayabilsin.
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Swagger'ı sadece geliştirme ortamında aç
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();

app.MapControllers();

app.Run();
