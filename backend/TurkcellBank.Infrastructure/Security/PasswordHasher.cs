using TurkcellBank.Application.Common.Interfaces;

namespace TurkcellBank.Infrastructure.Security;

/// <summary>
/// IPasswordHasher'ın BCrypt ile gerçek uygulaması.
/// BCrypt: yavaş ve tuzlu (salted) hashleme — şifre saldırılarına dayanıklı.
/// </summary>
public class PasswordHasher : IPasswordHasher
{
    public string Hash(string password)
        => BCrypt.Net.BCrypt.HashPassword(password);

    public bool Verify(string password, string hash)
        => BCrypt.Net.BCrypt.Verify(password, hash);
}
