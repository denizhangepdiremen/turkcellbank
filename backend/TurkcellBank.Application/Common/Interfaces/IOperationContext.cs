using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>
/// Bir isteğin "işlem bağlamı": işlemin kimin adına ve hangi kanaldan yapıldığı.
/// Normalde işlem giriş yapan kullanıcının kendisi içindir (İnternet kanalı).
/// Şube çalışanı müşteri adına işlem yaptığında <see cref="ActOnBehalfOf"/> ile
/// bağlam müşteriye yönlendirilir (Şube kanalı + çalışan damgası). Servisler
/// kaynak sahibini <see cref="ActingUserId"/>'den okur ve kayıtlara kanal/çalışan
/// damgasını yazar — böylece tek bir iş mantığı hem internet hem şube için çalışır.
/// İstek başına (scoped) bir örnektir.
/// </summary>
public interface IOperationContext
{
    Guid ActingUserId { get; }            // işlemin sahibi (müşteri)
    Guid? PerformedByEmployeeId { get; }  // adına işlemde şube çalışanı; aksi halde null
    Channel Channel { get; }              // İnternet (varsayılan) / Şube

    // Şube çalışanı bir müşteri adına işleme başlamadan önce çağırır.
    void ActOnBehalfOf(Guid customerId, Guid employeeId);
}
