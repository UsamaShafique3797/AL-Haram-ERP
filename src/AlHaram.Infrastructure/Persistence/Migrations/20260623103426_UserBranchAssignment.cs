using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AlHaram.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UserBranchAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "GodownId",
                table: "Users",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_GodownId",
                table: "Users",
                column: "GodownId");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Godowns_GodownId",
                table: "Users",
                column: "GodownId",
                principalTable: "Godowns",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Godowns_GodownId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_GodownId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "GodownId",
                table: "Users");
        }
    }
}
