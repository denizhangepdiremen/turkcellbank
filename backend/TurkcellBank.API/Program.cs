using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
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

// --- JWT kimlik doğrulama ---
// Gelen "Authorization: Bearer <token>" başlığındaki token'ı otomatik doğrular
// (imza, süre, issuer, audience). Geçerliyse kullanıcıyı "giriş yapmış" sayar.
var jwt = builder.Configuration.GetSection("Jwt");
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,        // süresi dolmuş token reddedilir
            ValidateIssuerSigningKey = true, // imza kontrolü (sahte token engellenir)
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwt["Key"]!)),
        };
    });

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

// Sıra önemli: önce kimlik doğrulama (kim?), sonra yetkilendirme (izinli mi?)
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
