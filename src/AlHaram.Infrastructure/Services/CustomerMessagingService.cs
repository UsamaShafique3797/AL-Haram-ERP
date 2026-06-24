using AlHaram.Application.Common.Models;
using AlHaram.Application.Companies;
using AlHaram.Application.Documents;
using AlHaram.Application.Messaging;
using AlHaram.Application.Sales;
using AlHaram.Application.WhatsApp;
using AlHaram.Infrastructure.Persistence;
using AlHaram.Infrastructure.WhatsApp;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class CustomerMessagingService : ICustomerMessagingService
{
    private readonly AppDbContext _db;
    private readonly ISalesInvoiceService _invoices;
    private readonly ICompanyService _company;
    private readonly IInvoicePdfService _pdf;
    private readonly IWhatsAppService _whatsApp;

    public CustomerMessagingService(
        AppDbContext db,
        ISalesInvoiceService invoices,
        ICompanyService company,
        IInvoicePdfService pdf,
        IWhatsAppService whatsApp)
    {
        _db = db;
        _invoices = invoices;
        _company = company;
        _pdf = pdf;
        _whatsApp = whatsApp;
    }

    public async Task<Result<WhatsAppSendResultDto>> SendInvoicePdfAsync(Guid invoiceId, CancellationToken ct = default)
    {
        var configError = ConfigError();
        if (configError is not null) return Result<WhatsAppSendResultDto>.Failure(configError);

        var invoice = await _invoices.GetByIdAsync(invoiceId, ct);
        if (invoice is null) return Result<WhatsAppSendResultDto>.Failure("Invoice not found.");

        var customer = await _db.Customers.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == invoice.CustomerId, ct);
        if (customer is null) return Result<WhatsAppSendResultDto>.Failure("Customer not found.");

        var phone = PhoneNumberHelper.ToWhatsAppDigits(customer.Phone);
        if (phone is null)
            return Result<WhatsAppSendResultDto>.Failure("Customer has no valid phone number for WhatsApp.");

        var company = await _company.GetAsync(ct);
        var companyInfo = ToCompanyInfo(company);
        var pdfBytes = _pdf.GenerateInvoicePdf(invoice, companyInfo);
        var fileName = SanitizeFileName($"{invoice.Number}.pdf");

        var caption =
            $"{company.Name}\n" +
            $"Invoice {invoice.Number}\n" +
            $"Date: {invoice.Date:dd/MM/yyyy}\n" +
            $"Total: Rs {invoice.Total:N2}\n" +
            $"Balance: Rs {invoice.Balance:N2}\n\n" +
            "Please find your invoice PDF attached.";

        try
        {
            await _whatsApp.SendDocumentAsync(phone, pdfBytes, fileName, caption, ct);
        }
        catch (Exception ex)
        {
            return Result<WhatsAppSendResultDto>.Failure(ex.Message);
        }

        return Result<WhatsAppSendResultDto>.Success(new WhatsAppSendResultDto(phone, $"Invoice PDF sent for {invoice.Number}."));
    }

    public async Task<Result<WhatsAppSendResultDto>> SendPaymentReminderAsync(
        Guid customerId,
        PaymentReminderMode mode,
        CancellationToken ct = default)
    {
        var configError = ConfigError();
        if (configError is not null) return Result<WhatsAppSendResultDto>.Failure(configError);

        var customer = await _db.Customers.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == customerId, ct);
        if (customer is null) return Result<WhatsAppSendResultDto>.Failure("Customer not found.");

        var phone = PhoneNumberHelper.ToWhatsAppDigits(customer.Phone);
        if (phone is null)
            return Result<WhatsAppSendResultDto>.Failure("Customer has no valid phone number for WhatsApp.");

        var openInvoices = await _invoices.GetOpenInvoicesAsync(customerId, ct);
        var totalOutstanding = openInvoices.Sum(i => i.Balance);

        if (totalOutstanding <= 0)
            return Result<WhatsAppSendResultDto>.Failure("This customer has no outstanding balance.");

        var company = await _company.GetAsync(ct);
        var companyInfo = ToCompanyInfo(company);

        try
        {
            if (mode == PaymentReminderMode.Statement)
            {
                var pdfBytes = _pdf.GenerateOutstandingStatementPdf(
                    customer.Name, openInvoices, totalOutstanding, companyInfo);
                var fileName = SanitizeFileName($"Statement-{customer.Name}.pdf");
                var caption = $"{company.Name}\nPayment reminder\nOutstanding: Rs {totalOutstanding:N2}";
                await _whatsApp.SendDocumentAsync(phone, pdfBytes, fileName, caption, ct);
                return Result<WhatsAppSendResultDto>.Success(
                    new WhatsAppSendResultDto(phone, "Outstanding statement PDF sent."));
            }

            var lines = openInvoices
                .Select(i => $"• {i.Number} ({i.Date:dd MMM yyyy}) — Rs {i.Balance:N2}")
                .ToList();
            var message =
                $"{company.Name}\n\n" +
                $"Dear {customer.Name},\n\n" +
                $"This is a friendly reminder that you have an outstanding balance of Rs {totalOutstanding:N2}.\n\n" +
                "Open invoices:\n" +
                string.Join("\n", lines) +
                "\n\nPlease arrange payment at your earliest convenience.\nThank you.";

            await _whatsApp.SendTextAsync(phone, message, ct);
            return Result<WhatsAppSendResultDto>.Success(
                new WhatsAppSendResultDto(phone, "Payment reminder message sent."));
        }
        catch (Exception ex)
        {
            return Result<WhatsAppSendResultDto>.Failure(ex.Message);
        }
    }

    public async Task<Result<PdfFileDto>> GetInvoicePdfAsync(Guid invoiceId, CancellationToken ct = default)
    {
        var invoice = await _invoices.GetByIdAsync(invoiceId, ct);
        if (invoice is null) return Result<PdfFileDto>.Failure("Invoice not found.");

        var company = await _company.GetAsync(ct);
        var pdfBytes = _pdf.GenerateInvoicePdf(invoice, ToCompanyInfo(company));
        return Result<PdfFileDto>.Success(new PdfFileDto(pdfBytes, SanitizeFileName($"{invoice.Number}.pdf")));
    }

    public async Task<Result<PdfFileDto>> GetStatementPdfAsync(Guid customerId, CancellationToken ct = default)
    {
        var customer = await _db.Customers.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == customerId, ct);
        if (customer is null) return Result<PdfFileDto>.Failure("Customer not found.");

        var openInvoices = await _invoices.GetOpenInvoicesAsync(customerId, ct);
        var totalOutstanding = openInvoices.Sum(i => i.Balance);
        if (totalOutstanding <= 0)
            return Result<PdfFileDto>.Failure("This customer has no outstanding balance.");

        var company = await _company.GetAsync(ct);
        var pdfBytes = _pdf.GenerateOutstandingStatementPdf(
            customer.Name, openInvoices, totalOutstanding, ToCompanyInfo(company));
        return Result<PdfFileDto>.Success(new PdfFileDto(pdfBytes, SanitizeFileName($"Statement-{customer.Name}.pdf")));
    }

    private string? ConfigError() =>
        _whatsApp.IsConfigured
            ? null
            : "WhatsApp is not configured on the server. Add WhatsApp settings (AccessToken, PhoneNumberId) in appsettings.";

    private static InvoicePdfCompanyInfo ToCompanyInfo(CompanyDto c) =>
        new(c.Name, c.Address, c.Phone, c.TaxNumber, c.Currency);

    private static string SanitizeFileName(string name)
    {
        foreach (var ch in Path.GetInvalidFileNameChars())
            name = name.Replace(ch, '-');
        return name;
    }
}
