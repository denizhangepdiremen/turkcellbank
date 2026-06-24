using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TurkcellBank.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountFreezeType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FreezeType",
                table: "Accounts",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "None"); // enum varsayılanı (boş string enum okumada patlar)
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FreezeType",
                table: "Accounts");
        }
    }
}
