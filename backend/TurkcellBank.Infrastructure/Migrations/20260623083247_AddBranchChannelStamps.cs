using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TurkcellBank.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBranchChannelStamps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Channel",
                table: "Transactions",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "PerformedByEmployeeId",
                table: "Transactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Channel",
                table: "Payments",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "PerformedByEmployeeId",
                table: "Payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Channel",
                table: "LoanApplications",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "PerformedByEmployeeId",
                table: "LoanApplications",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Channel",
                table: "Cards",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "PerformedByEmployeeId",
                table: "Cards",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Channel",
                table: "Accounts",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "PerformedByEmployeeId",
                table: "Accounts",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Channel",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "PerformedByEmployeeId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Channel",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "PerformedByEmployeeId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "Channel",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "PerformedByEmployeeId",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "Channel",
                table: "Cards");

            migrationBuilder.DropColumn(
                name: "PerformedByEmployeeId",
                table: "Cards");

            migrationBuilder.DropColumn(
                name: "Channel",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "PerformedByEmployeeId",
                table: "Accounts");
        }
    }
}
