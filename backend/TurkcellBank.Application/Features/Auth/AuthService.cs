using FluentValidation;
using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Auth.Dtos;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Auth;

/// <summary>
/// Kimlik doğrulama iş mantığı. Bağımlılıklar (repository, hasher, validator)
/// hep ARAYÜZ üzerinden gelir → test edilebilir, Infrastructure'a doğrudan bağlı değil.
/// </summary>
public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IValidator<RegisterRequest> _registerValidator;
    private readonly IValidator<LoginRequest> _loginValidator;

    public AuthService(
        IUserRepository users,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IValidator<RegisterRequest> registerValidator,
        IValidator<LoginRequest> loginValidator)
    {
        _users = users;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _registerValidator = registerValidator;
        _loginValidator = loginValidator;
    }

    public async Task<UserDto> RegisterAsync(RegisterRequest request)
    {
        // 1) Doğrulama — geçmezse ValidationException (middleware 400 + errors döner)
        var validation = await _registerValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            var messages = validation.Errors.Select(e => e.ErrorMessage).ToList();
            // Tam ad: FluentValidation'ın ValidationException'ı ile karışmasın
            throw new Common.Exceptions.ValidationException(messages);
        }

        // E-postayı normalize et (boşlukları temizle, küçük harfe çevir)
        var email = request.Email.Trim().ToLowerInvariant();

        // 2) E-posta zaten kayıtlı mı?
        if (await _users.EmailExistsAsync(email))
        {
            throw new BusinessException("Bu e-posta adresi zaten kayıtlı.");
        }

        // 3) Kullanıcıyı oluştur — şifre BCrypt ile hash'lenir (düz metin saklanmaz)
        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Role = UserRole.Customer, // yeni kullanıcı her zaman müşteri
            CreatedAt = DateTime.UtcNow,
        };

        // 4) Veritabanına kaydet
        await _users.AddAsync(user);

        // 5) Güvenli DTO dön (hash vb. hassas veri dışarı çıkmaz)
        return new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString());
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        // 1) Doğrulama (alanlar boş mu)
        var validation = await _loginValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            var messages = validation.Errors.Select(e => e.ErrorMessage).ToList();
            throw new Common.Exceptions.ValidationException(messages);
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _users.GetByEmailAsync(email);

        // 2) Güvenlik: kullanıcı yok VEYA şifre yanlış → AYNI genel mesaj.
        //    (Hangisinin hatalı olduğunu söylemek saldırgana ipucu verir.)
        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            throw new BusinessException("E-posta veya şifre hatalı.");
        }

        // 3) Token üret ve cevabı oluştur
        var (token, expiresAt) = _tokenService.GenerateToken(user);
        var userDto = new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString());

        return new AuthResponse(token, expiresAt, userDto);
    }
}
