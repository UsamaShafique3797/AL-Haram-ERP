using AlHaram.Application.Sales;

namespace AlHaram.Application.Documents;

public interface IInvoicePdfService
{
    byte[] GenerateInvoicePdf(SalesInvoiceDto invoice, InvoicePdfCompanyInfo company);

    byte[] GenerateOutstandingStatementPdf(
        string customerName,
        IReadOnlyList<OpenInvoiceDto> openInvoices,
        decimal totalOutstanding,
        InvoicePdfCompanyInfo company);
}

public record InvoicePdfCompanyInfo(
    string Name,
    string? Address,
    string? Phone,
    string? TaxNumber,
    string Currency);
