using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using TurkcellBank.API.Middleware;
using TurkcellBank.API.RateLimiting;
using TurkcellBank.API.Services;
using TurkcellBank.Application;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Loans;
using TurkcellBank.Infrastructure;
using TurkcellBank.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// --- Servisler (DI konteyneri) ---

// Controller'lar + enum'ları metin olarak (de)serialize et ("Bireysel" gibi)
builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// Şu anki kullanıcıyı token'dan okuyabilmek için
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
// İşlem bağlamı (kimin adına + hangi kanal) — şube "adına işlem" için scoped
builder.Services.AddScoped<IOperationContext, OperationContext>();

// Swagger / OpenAPI + JWT "Authorize" butonu
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    var jwtScheme = new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "JWT token'ı buraya yapıştırın ('Bearer' yazmadan).",
        Reference = new Microsoft.OpenApi.Models.OpenApiReference
        {
            Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
            Id = "Bearer",
        },
    };
    options.AddSecurityDefinition("Bearer", jwtScheme);
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        { jwtScheme, Array.Empty<string>() },
    });
});

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

// Tutar bazlı kredi onay eşikleri (config "Loan" bölümü; yoksa varsayılanlar)
builder.Services.AddSingleton(
    builder.Configuration.GetSection("Loan").Get<LoanApprovalOptions>()
        ?? new LoanApprovalOptions());

// Havale güvenlik eşikleri (config "Transfer" bölümü; yoksa varsayılanlar)
builder.Services.AddSingleton(
    builder.Configuration.GetSection("Transfer").Get<TurkcellBank.Application.Features.Transactions.TransferOptions>()
        ?? new TurkcellBank.Application.Features.Transactions.TransferOptions());

// --- Hız sınırlama (rate limiting) ---
// Sabit pencere, IP başına. "auth"/"register" politikaları ilgili endpoint'lerde
// (brute-force koruması); ayrıca tüm istekler için gevşek global limiter.
// Limitler config "RateLimit"ten gelir (prod sıkı, dev gevşek -> appsettings.Development).
var rateLimit = builder.Configuration.GetSection("RateLimit").Get<RateLimitOptions>()
    ?? new RateLimitOptions();

static string ClientIp(HttpContext ctx) =>
    ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";

static PartitionedRateLimiter<HttpContext> FixedByIp(RateLimitRule rule) =>
    PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(ClientIp(ctx), _ =>
            new FixedWindowRateLimiterOptions
            {
                PermitLimit = rule.PermitLimit,
                Window = TimeSpan.FromSeconds(rule.WindowSeconds),
                QueueLimit = 0,
            }));

builder.Services.AddRateLimiter(options =>
{
    // Tüm istekler için gevşek global limiter (savunma derinliği)
    options.GlobalLimiter = FixedByIp(rateLimit.Global);

    // Sıkı politikalar (auth endpoint'lerinde [EnableRateLimiting] ile)
    options.AddPolicy("auth", ctx =>
        RateLimitPartition.GetFixedWindowLimiter(ClientIp(ctx), _ =>
            new FixedWindowRateLimiterOptions
            {
                PermitLimit = rateLimit.Auth.PermitLimit,
                Window = TimeSpan.FromSeconds(rateLimit.Auth.WindowSeconds),
                QueueLimit = 0,
            }));
    options.AddPolicy("register", ctx =>
        RateLimitPartition.GetFixedWindowLimiter(ClientIp(ctx), _ =>
            new FixedWindowRateLimiterOptions
            {
                PermitLimit = rateLimit.Register.PermitLimit,
                Window = TimeSpan.FromSeconds(rateLimit.Register.WindowSeconds),
                QueueLimit = 0,
            }));

    // Limit aşımında tutarlı 429 + Retry-After (ApiResponse formatı)
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            context.HttpContext.Response.Headers.RetryAfter =
                ((int)retryAfter.TotalSeconds).ToString();
        await context.HttpContext.Response.WriteAsJsonAsync(
            ApiResponse<string>.Fail("Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin."),
            token);
    };
});

// Infrastructure katmanı: veritabanı (PostgreSQL + EF Core) bağlantısı
// Tek satırla; detaylar Infrastructure/DependencyInjection.cs içinde.
builder.Services.AddInfrastructure(builder.Configuration);

// Düzenli ödeme talimatlarını periyodik çalıştıran arka plan servisi
builder.Services.AddHostedService<TurkcellBank.API.Services.PaymentOrderWorker>();
// Vadesi dolan vadeli mevduatları periyodik işleyen arka plan servisi
builder.Services.AddHostedService<TurkcellBank.API.Services.TimeDepositWorker>();

// --- JWT kimlik doğrulama ---
// Gelen "Authorization: Bearer <token>" başlığındaki token'ı otomatik doğrular
// (imza, süre, issuer, audience). Geçerliyse kullanıcıyı "giriş yapmış" sayar.
var jwt = builder.Configuration.GetSection("Jwt");
// Guard: JWT key yapılandırılmamışsa uygulama net bir hatayla dursun
// (user-secrets veya environment variable ile sağlanmalı).
var jwtKey = jwt["Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException(
        "Jwt:Key yapılandırılmamış. Geliştirmede 'dotnet user-secrets', " +
        "production'da environment variable ile sağlayın.");
}
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
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        };
    });

var app = builder.Build();

// Açılışta admin seed (yoksa varsayılan admin oluşturulur)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    await DbSeeder.SeedAsync(db, hasher, config);
}

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

// Hız sınırlama: yetkilendirmeden sonra, endpoint'lerden önce
app.UseRateLimiter();

app.MapControllers();

app.Run();
