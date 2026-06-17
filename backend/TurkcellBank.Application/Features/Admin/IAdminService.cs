using TurkcellBank.Application.Features.Auth.Dtos;

namespace TurkcellBank.Application.Features.Admin;

/// <summary>Admin işlemleri (şimdilik kullanıcı listeleme).</summary>
public interface IAdminService
{
    Task<List<UserDto>> GetUsersAsync();
}
