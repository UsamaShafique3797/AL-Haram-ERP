using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AlHaram.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class QuotationCustomerName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "CustomerId",
                table: "Quotations",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<string>(
                name: "CustomerName",
                table: "Quotations",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            // Preserve the customer name for existing quotations by copying it from the linked customer.
            migrationBuilder.Sql(@"
UPDATE q SET CustomerName = c.Name
FROM Quotations q JOIN Customers c ON c.Id = q.CustomerId
WHERE (q.CustomerName IS NULL OR q.CustomerName = '');");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomerName",
                table: "Quotations");

            migrationBuilder.AlterColumn<Guid>(
                name: "CustomerId",
                table: "Quotations",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
        }
    }
}
