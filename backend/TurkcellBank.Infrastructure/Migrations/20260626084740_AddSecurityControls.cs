using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TurkcellBank.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSecurityControls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DailyTransferLimit",
                table: "Users",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "OnlineShoppingEnabled",
                table: "Cards",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DailyTransferLimit",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "OnlineShoppingEnabled",
                table: "Cards");
        }
    }
}
