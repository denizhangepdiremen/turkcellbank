namespace TurkcellBank.Application.Features.SavedRecipients.Dtos;

/// <summary>Kayıtlı alıcı oluşturma isteği.</summary>
public record CreateSavedRecipientRequest(string Name, string Iban, string? Note);
