using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using TurkcellBank.API.Middleware;
using TurkcellBank.API.Services;
using TurkcellBank.Application;
using TurkcellBank.Application.Common.Interfaces;
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

// Infrastructure katmanı: veritabanı (PostgreSQL + EF Core) bağlantısı
// Tek satırla; detaylar Infrastructure/DependencyInjection.cs içinde.
builder.Services.AddInfrastructure(builder.Configuration);

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

app.MapControllers();

app.Run();
