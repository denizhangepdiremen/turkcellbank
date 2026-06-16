using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Infrastructure.Security;

/// <summary>
/// ITokenService'in gerçek (JWT) uygulaması.
/// appsettings.json'daki "Jwt" ayarlarını okur, kullanıcı için imzalı token üretir.
/// </summary>
public class JwtTokenService : ITokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, DateTime ExpiresAt) GenerateToken(User user)
    {
        var jwt = _configuration.GetSection("Jwt");
        var key = jwt["Key"]!;
        var issuer = jwt["Issuer"];
        var audience = jwt["Audience"];
        var expiryMinutes = int.Parse(jwt["ExpiryMinutes"] ?? "60");

        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

        // Token'ın içine konacak bilgiler (claims). Hassas veri (şifre vb.) KOYULMAZ.
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role.ToString()), // RBAC için
        };

        // Gizli anahtarla imzalama (HMAC-SHA256)
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return (tokenString, expiresAt);
    }
}
