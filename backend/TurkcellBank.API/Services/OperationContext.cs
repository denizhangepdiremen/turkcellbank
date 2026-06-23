using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.API.Services;

/// <summary>
/// IOperationContext'in istek-kapsamlı (scoped) uygulaması. Varsayılan olarak
/// işlem giriş yapan kullanıcının kendisi içindir (İnternet). Şube çalışanı
/// <see cref="ActOnBehalfOf"/> çağırınca bağlam hedef müşteriye yönlenir (Şube).
/// </summary>
public class OperationContext : IOperationContext
{
    private readonly ICurrentUserService _currentUser;
    private Guid? _customerId;
    private Guid? _employeeId;

    public OperationContext(ICurrentUserService currentUser)
    {
        _currentUser = currentUser;
    }

    public Guid ActingUserId => _customerId ?? _currentUser.UserId;
    public Guid? PerformedByEmployeeId => _employeeId;
    public Channel Channel => _customerId is null ? Channel.Internet : Channel.Branch;

    public void ActOnBehalfOf(Guid customerId, Guid employeeId)
    {
        _customerId = customerId;
        _employeeId = employeeId;
    }
}
