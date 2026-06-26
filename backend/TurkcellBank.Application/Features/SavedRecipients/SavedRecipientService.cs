using FluentValidation;
using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.SavedRecipients.Dtos;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Features.SavedRecipients;

public class SavedRecipientService : ISavedRecipientService
{
    private readonly ISavedRecipientRepository _recipients;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateSavedRecipientRequest> _validator;

    public SavedRecipientService(
        ISavedRecipientRepository recipients,
        ICurrentUserService currentUser,
        IValidator<CreateSavedRecipientRequest> validator)
    {
        _recipients = recipients;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<List<SavedRecipientDto>> GetMineAsync()
    {
        var list = await _recipients.GetByUserIdAsync(_currentUser.UserId);
        return list.Select(Map).ToList();
    }

    public async Task<SavedRecipientDto> CreateAsync(CreateSavedRecipientRequest request)
    {
        var validation = await _validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new Common.Exceptions.ValidationException(
                validation.Errors.Select(e => e.ErrorMessage).ToList());

        var iban = NormalizeIban(request.Iban);
        if (await _recipients.ExistsByUserIdAndIbanAsync(_currentUser.UserId, iban))
            throw new BusinessException("Bu alıcı zaten kayıtlı.");

        var recipient = new SavedRecipient
        {
            Id = Guid.NewGuid(),
            UserId = _currentUser.UserId,
            Name = request.Name.Trim(),
            Iban = iban,
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        await _recipients.AddAsync(recipient);
        return Map(recipient);
    }

    public async Task DeleteAsync(Guid id)
    {
        var recipient = await _recipients.GetByIdAsync(id);
        if (recipient is null || recipient.UserId != _currentUser.UserId)
            throw new NotFoundException("Kayıtlı alıcı bulunamadı.");

        await _recipients.DeleteAsync(recipient);
    }

    private static string NormalizeIban(string iban) =>
        iban.Replace(" ", "").ToUpperInvariant();

    private static SavedRecipientDto Map(SavedRecipient recipient) =>
        new(recipient.Id, recipient.Name, recipient.Iban, recipient.Note, recipient.CreatedAt);
}
