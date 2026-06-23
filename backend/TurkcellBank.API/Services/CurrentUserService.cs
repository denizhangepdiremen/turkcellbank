using System.Security.Claims;
using TurkcellBank.Application.Common.Interfaces;

namespace TurkcellBank.API.Services;

/// <summary>
/// ICurrentUserService'in gerçek uygulaması.
/// IHttpContextAccessor ile o anki isteğin token claim'lerinden kullanıcı id'sini okur.
/// </summary>
public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid UserId
    {
        get
        {
            var id = _httpContextAccessor.HttpContext?.User
                ?.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.Parse(id!); // [Authorize]'lı endpoint'lerde her zaman dolu
        }
    }

    public string? Role =>
        _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Role);
}
