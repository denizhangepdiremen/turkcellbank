using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TurkcellBank.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLoanRepayment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DisbursementAccountId",
                table: "LoanApplications",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "InstallmentsPaid",
                table: "LoanApplications",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyInstallment",
                table: "LoanApplications",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "RemainingDebt",
                table: "LoanApplications",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DisbursementAccountId",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "InstallmentsPaid",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "MonthlyInstallment",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "RemainingDebt",
                table: "LoanApplications");
        }
    }
}
