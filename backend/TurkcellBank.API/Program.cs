using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using TurkcellBank.API.Middleware;
using TurkcellBank.API.Services;
using TurkcellBank.Application;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// --- Servisler (DI konteyneri) ---

// Controller'lar + enum'ları metin olarak (de)serialize et ("Bireysel" gibi)
builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// Şu anki kullanıcıyı token'dan okuyabilmek için
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS: frontend (Vite dev sunucusu) backend'i çağırabilsin diye izin ver.
const string FrontendCors = "FrontendCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCors, policy =>
        policy.WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

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

// CORS, kimlik doğrulamadan önce gelmeli
app.UseCors(FrontendCors);

// Sıra önemli: önce kimlik doğrulama (kim?), sonra yetkilendirme (izinli mi?)
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
