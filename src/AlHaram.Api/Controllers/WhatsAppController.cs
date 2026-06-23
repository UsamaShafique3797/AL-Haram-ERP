using AlHaram.Application.Messaging;
using AlHaram.Application.WhatsApp;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/whatsapp")]
[Authorize]
public class WhatsAppController : ControllerBase
{
    private readonly IWhatsAppService _whatsApp;
    private readonly WhatsAppSettings _settings;

    public WhatsAppController(IWhatsAppService whatsApp, IOptions<WhatsAppSettings> settings)
    {
        _whatsApp = whatsApp;
        _settings = settings.Value;
    }

    [HttpGet("status")]
    public IActionResult Status()
    {
        var dto = new WhatsAppStatusDto(
            _whatsApp.IsConfigured,
            _whatsApp.IsConfigured
                ? "Paid Meta WhatsApp API is configured for automatic server-side sending."
                : "Using free WhatsApp Web links (wa.me). PDF is downloaded and chat opens — attach the file and tap Send.");
        return Ok(dto);
    }
}

[ApiController]
[Route("api/customer-messaging")]
[Authorize]
public class CustomerMessagingController : ControllerBase
{
    private readonly ICustomerMessagingService _messaging;

    public CustomerMessagingController(ICustomerMessagingService messaging) => _messaging = messaging;

    [HttpGet("invoices/{invoiceId:guid}/pdf")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.Salesman}")]
    public async Task<IActionResult> DownloadInvoicePdf(Guid invoiceId, CancellationToken ct)
    {
        var result = await _messaging.GetInvoicePdfAsync(invoiceId, ct);
        if (!result.Succeeded) return BadRequest(new { errors = result.Errors });
        return File(result.Data!.Content, "application/pdf", result.Data.FileName);
    }

    [HttpGet("customers/{customerId:guid}/statement.pdf")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.Salesman}")]
    public async Task<IActionResult> DownloadStatementPdf(Guid customerId, CancellationToken ct)
    {
        var result = await _messaging.GetStatementPdfAsync(customerId, ct);
        if (!result.Succeeded) return BadRequest(new { errors = result.Errors });
        return File(result.Data!.Content, "application/pdf", result.Data.FileName);
    }

    [HttpPost("invoices/{invoiceId:guid}/whatsapp")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.Salesman}")]
    public async Task<IActionResult> SendInvoice(Guid invoiceId, CancellationToken ct)
    {
        var result = await _messaging.SendInvoicePdfAsync(invoiceId, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }

    [HttpPost("customers/{customerId:guid}/payment-reminder")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.Salesman}")]
    public async Task<IActionResult> SendPaymentReminder(
        Guid customerId,
        [FromBody] SendPaymentReminderRequest request,
        CancellationToken ct)
    {
        var result = await _messaging.SendPaymentReminderAsync(customerId, request.Mode, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }
}

public record SendPaymentReminderRequest(PaymentReminderMode Mode);
