using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.SavedRecipients;
using TurkcellBank.Application.Features.SavedRecipients.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>Kayıtlı alıcılar. Tümü [Authorize].</summary>
[ApiController]
[Route("api/recipients")]
[Authorize]
public class SavedRecipientsController : ControllerBase
{
    private readonly ISavedRecipientService _service;

    public SavedRecipientsController(ISavedRecipientService service)
    {
        _service = service;
    }

    /// <summary>Kayıtlı alıcılarım. GET /api/recipients</summary>
    [HttpGet]
    public async Task<IActionResult> Mine()
    {
        var recipients = await _service.GetMineAsync();
        return Ok(ApiResponse<List<SavedRecipientDto>>.SuccessResponse(recipients));
    }

    /// <summary>Yeni kayıtlı alıcı ekle. POST /api/recipients</summary>
    [HttpPost]
    public async Task<IActionResult> Create(CreateSavedRecipientRequest request)
    {
        var recipient = await _service.CreateAsync(request);
        return Ok(ApiResponse<SavedRecipientDto>.SuccessResponse(recipient, "Alıcı kaydedildi."));
    }

    /// <summary>Kayıtlı alıcı sil. DELETE /api/recipients/{id}</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse<string>.SuccessResponse("ok", "Alıcı silindi."));
    }
}
