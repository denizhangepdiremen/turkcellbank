using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Auth.Dtos;

namespace TurkcellBank.Application.Features.Admin;

public class AdminService : IAdminService
{
    private readonly IUserRepository _users;

    public AdminService(IUserRepository users)
    {
        _users = users;
    }

    public async Task<List<UserDto>> GetUsersAsync()
    {
        var users = await _users.GetAllAsync();
        // Hassas alanlar (PasswordHash) dışarı verilmez — güvenli DTO
        return users
            .Select(u => new UserDto(u.Id, u.FullName, u.Email, u.Role.ToString()))
            .ToList();
    }
}
