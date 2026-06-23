using AlHaram.Application.Documents;
using AlHaram.Application.Sales;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace AlHaram.Infrastructure.Documents;

public class InvoicePdfService : IInvoicePdfService
{
    static InvoicePdfService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] GenerateInvoicePdf(SalesInvoiceDto invoice, InvoicePdfCompanyInfo company) =>
        Document.Create(doc =>
        {
            doc.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text(company.Name).FontSize(18).Bold().FontColor(Colors.Red.Medium);
                            if (!string.IsNullOrWhiteSpace(company.Address))
                                c.Item().Text(company.Address).FontColor(Colors.Grey.Darken1);
                            if (!string.IsNullOrWhiteSpace(company.Phone))
                                c.Item().Text($"Phone: {company.Phone}").FontColor(Colors.Grey.Darken1);
                            if (!string.IsNullOrWhiteSpace(company.TaxNumber))
                                c.Item().Text($"NTN: {company.TaxNumber}").FontColor(Colors.Grey.Darken1);
                        });
                        row.ConstantItem(180).AlignRight().Column(c =>
                        {
                            c.Item().Text("SALES INVOICE").FontSize(14).Bold();
                            c.Item().Text(invoice.Number).Bold();
                            c.Item().Text($"Date: {invoice.Date:dd MMM yyyy}");
                        });
                    });
                    col.Item().PaddingVertical(8).LineHorizontal(1).LineColor(Colors.Grey.Darken2);
                });

                page.Content().Column(col =>
                {
                    col.Item().PaddingBottom(8).Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Bill to").FontSize(8).FontColor(Colors.Grey.Medium);
                            c.Item().Text(invoice.CustomerName).FontSize(12).Bold();
                        });
                        row.ConstantItem(160).AlignRight().Column(c =>
                        {
                            c.Item().Text("Godown").FontSize(8).FontColor(Colors.Grey.Medium);
                            c.Item().Text(invoice.GodownName);
                        });
                    });

                    col.Item().PaddingVertical(6).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.ConstantColumn(24);
                            cols.RelativeColumn(3);
                            cols.RelativeColumn();
                            cols.RelativeColumn();
                            cols.RelativeColumn();
                            cols.RelativeColumn();
                            cols.RelativeColumn();
                        });

                        table.Header(h =>
                        {
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("#").Bold();
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Item").Bold();
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).AlignRight().Text("Qty").Bold();
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Unit").Bold();
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).AlignRight().Text("Rate").Bold();
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).AlignRight().Text("Disc.").Bold();
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).AlignRight().Text("Amount").Bold();
                        });

                        var idx = 1;
                        foreach (var line in invoice.Lines)
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(idx.ToString());
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(4)
                                .Text($"{line.ItemName} ({line.ItemCode})");
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(4).AlignRight()
                                .Text(line.Quantity.ToString("N4"));
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(line.UnitCode);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(4).AlignRight()
                                .Text(Money(line.Rate));
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(4).AlignRight()
                                .Text(Money(line.Discount));
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(4).AlignRight()
                                .Text(Money(line.LineTotal));
                            idx++;
                        }
                    });

                    col.Item().AlignRight().Width(240).PaddingTop(10).Column(totals =>
                    {
                        totals.Item().Row(r => { r.RelativeItem().Text("Subtotal"); r.ConstantItem(90).AlignRight().Text(Money(invoice.Subtotal)); });
                        if (invoice.Discount > 0)
                            totals.Item().Row(r => { r.RelativeItem().Text("Discount"); r.ConstantItem(90).AlignRight().Text($"− {Money(invoice.Discount)}"); });
                        if (invoice.TaxRate > 0)
                            totals.Item().Row(r => { r.RelativeItem().Text($"Tax ({invoice.TaxRate:N2}%)"); r.ConstantItem(90).AlignRight().Text(Money(invoice.TaxAmount)); });
                        totals.Item().PaddingTop(4).BorderTop(1).Row(r =>
                        {
                            r.RelativeItem().Text("Total").Bold();
                            r.ConstantItem(90).AlignRight().Text(Money(invoice.Total)).Bold();
                        });
                        if (invoice.PaidAmount > 0)
                            totals.Item().Row(r => { r.RelativeItem().Text("Paid"); r.ConstantItem(90).AlignRight().Text($"− {Money(invoice.PaidAmount)}"); });
                        totals.Item().Row(r =>
                        {
                            r.RelativeItem().Text("Balance due").Bold().FontColor(Colors.Red.Medium);
                            r.ConstantItem(90).AlignRight().Text(Money(invoice.Balance)).Bold()
                                .FontColor(invoice.Balance > 0 ? Colors.Red.Medium : Colors.Green.Medium);
                        });
                    });

                    if (!string.IsNullOrWhiteSpace(invoice.Notes))
                    {
                        col.Item().PaddingTop(12).Column(n =>
                        {
                            n.Item().Text("Notes").FontSize(8).FontColor(Colors.Grey.Medium);
                            n.Item().Text(invoice.Notes!);
                        });
                    }
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Thank you for your business. · ").FontColor(Colors.Grey.Medium);
                    text.Span($"{company.Name} · {company.Currency}").FontColor(Colors.Grey.Medium);
                });
            });
        }).GeneratePdf();

    public byte[] GenerateOutstandingStatementPdf(
        string customerName,
        IReadOnlyList<OpenInvoiceDto> openInvoices,
        decimal totalOutstanding,
        InvoicePdfCompanyInfo company) =>
        Document.Create(doc =>
        {
            doc.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Content().Column(col =>
                {
                    col.Item().Text(company.Name).FontSize(18).Bold().FontColor(Colors.Red.Medium);
                    col.Item().PaddingTop(4).Text("Outstanding statement").FontSize(14).Bold();
                    col.Item().PaddingTop(8).Text($"Customer: {customerName}").FontSize(12).Bold();
                    col.Item().Text($"Generated: {DateTime.UtcNow:dd MMM yyyy}").FontColor(Colors.Grey.Darken1);

                    col.Item().PaddingVertical(10).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn(2);
                            cols.RelativeColumn();
                            cols.RelativeColumn();
                            cols.RelativeColumn();
                        });

                        table.Header(h =>
                        {
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Invoice").Bold();
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Date").Bold();
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).AlignRight().Text("Total").Bold();
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).AlignRight().Text("Balance").Bold();
                        });

                        foreach (var inv in openInvoices)
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(inv.Number);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(inv.Date.ToString("dd MMM yyyy"));
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(4).AlignRight().Text(Money(inv.Total));
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(4).AlignRight().Text(Money(inv.Balance));
                        }
                    });

                    col.Item().AlignRight().Width(200).PaddingTop(8).Text($"Total outstanding: {Money(totalOutstanding)}")
                        .Bold().FontColor(Colors.Red.Medium);

                    col.Item().PaddingTop(16).Text("Please arrange payment at your earliest convenience.")
                        .FontColor(Colors.Grey.Darken1);
                });
            });
        }).GeneratePdf();

    private static string Money(decimal value) => $"Rs {value:N2}";
}
