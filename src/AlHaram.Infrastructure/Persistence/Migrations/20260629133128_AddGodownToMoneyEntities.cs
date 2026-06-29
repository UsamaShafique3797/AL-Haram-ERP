using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AlHaram.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGodownToMoneyEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "GodownId",
                table: "SupplierPayments",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "GodownId",
                table: "Expenses",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "GodownId",
                table: "CustomerReceipts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "GodownId",
                table: "CashBankTransactions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupplierPayments_GodownId",
                table: "SupplierPayments",
                column: "GodownId");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_GodownId",
                table: "Expenses",
                column: "GodownId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerReceipts_GodownId",
                table: "CustomerReceipts",
                column: "GodownId");

            migrationBuilder.CreateIndex(
                name: "IX_CashBankTransactions_GodownId",
                table: "CashBankTransactions",
                column: "GodownId");

            migrationBuilder.AddForeignKey(
                name: "FK_CashBankTransactions_Godowns_GodownId",
                table: "CashBankTransactions",
                column: "GodownId",
                principalTable: "Godowns",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_CustomerReceipts_Godowns_GodownId",
                table: "CustomerReceipts",
                column: "GodownId",
                principalTable: "Godowns",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_Godowns_GodownId",
                table: "Expenses",
                column: "GodownId",
                principalTable: "Godowns",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SupplierPayments_Godowns_GodownId",
                table: "SupplierPayments",
                column: "GodownId",
                principalTable: "Godowns",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Backfill the branch for existing money rows so historical data is consistent with
            // the new per-branch reporting. Documents tied to an invoice inherit that invoice's
            // branch; receipts/payments inherit the branch of an allocated invoice; anything left
            // (legacy on-account receipts, expenses) falls back to the default godown.
            migrationBuilder.Sql(@"
DECLARE @def uniqueidentifier = (SELECT TOP 1 Id FROM Godowns WHERE IsDefault = 1);
IF @def IS NULL SET @def = (SELECT TOP 1 Id FROM Godowns ORDER BY Name);

UPDATE r SET GodownId = (
    SELECT TOP 1 si.GodownId FROM ReceiptAllocations ra
    JOIN SalesInvoices si ON si.Id = ra.SalesInvoiceId
    WHERE ra.CustomerReceiptId = r.Id)
FROM CustomerReceipts r WHERE r.GodownId IS NULL;
UPDATE CustomerReceipts SET GodownId = @def WHERE GodownId IS NULL;

UPDATE p SET GodownId = (
    SELECT TOP 1 pi.GodownId FROM PaymentAllocations pa
    JOIN PurchaseInvoices pi ON pi.Id = pa.PurchaseInvoiceId
    WHERE pa.SupplierPaymentId = p.Id)
FROM SupplierPayments p WHERE p.GodownId IS NULL;
UPDATE SupplierPayments SET GodownId = @def WHERE GodownId IS NULL;

UPDATE Expenses SET GodownId = @def WHERE GodownId IS NULL;

UPDATE c SET GodownId = si.GodownId FROM CashBankTransactions c
    JOIN SalesInvoices si ON si.Id = c.SourceDocumentId WHERE c.GodownId IS NULL;
UPDATE c SET GodownId = pi.GodownId FROM CashBankTransactions c
    JOIN PurchaseInvoices pi ON pi.Id = c.SourceDocumentId WHERE c.GodownId IS NULL;
UPDATE c SET GodownId = r.GodownId FROM CashBankTransactions c
    JOIN CustomerReceipts r ON r.Id = c.SourceDocumentId WHERE c.GodownId IS NULL;
UPDATE c SET GodownId = p.GodownId FROM CashBankTransactions c
    JOIN SupplierPayments p ON p.Id = c.SourceDocumentId WHERE c.GodownId IS NULL;
UPDATE c SET GodownId = e.GodownId FROM CashBankTransactions c
    JOIN Expenses e ON e.Id = c.SourceDocumentId WHERE c.GodownId IS NULL;
UPDATE CashBankTransactions SET GodownId = @def WHERE GodownId IS NULL;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CashBankTransactions_Godowns_GodownId",
                table: "CashBankTransactions");

            migrationBuilder.DropForeignKey(
                name: "FK_CustomerReceipts_Godowns_GodownId",
                table: "CustomerReceipts");

            migrationBuilder.DropForeignKey(
                name: "FK_Expenses_Godowns_GodownId",
                table: "Expenses");

            migrationBuilder.DropForeignKey(
                name: "FK_SupplierPayments_Godowns_GodownId",
                table: "SupplierPayments");

            migrationBuilder.DropIndex(
                name: "IX_SupplierPayments_GodownId",
                table: "SupplierPayments");

            migrationBuilder.DropIndex(
                name: "IX_Expenses_GodownId",
                table: "Expenses");

            migrationBuilder.DropIndex(
                name: "IX_CustomerReceipts_GodownId",
                table: "CustomerReceipts");

            migrationBuilder.DropIndex(
                name: "IX_CashBankTransactions_GodownId",
                table: "CashBankTransactions");

            migrationBuilder.DropColumn(
                name: "GodownId",
                table: "SupplierPayments");

            migrationBuilder.DropColumn(
                name: "GodownId",
                table: "Expenses");

            migrationBuilder.DropColumn(
                name: "GodownId",
                table: "CustomerReceipts");

            migrationBuilder.DropColumn(
                name: "GodownId",
                table: "CashBankTransactions");
        }
    }
}
