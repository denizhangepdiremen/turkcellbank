using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TurkcellBank.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLoanAiEvaluation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NationalId",
                table: "Users",
                type: "character varying(11)",
                maxLength: 11,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Age",
                table: "LoanApplications",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "AiReason",
                table: "LoanApplications",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ChildrenCount",
                table: "LoanApplications",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "DecidedBy",
                table: "LoanApplications",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "EmploymentMonths",
                table: "LoanApplications",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "ExistingDebt",
                table: "LoanApplications",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "HousingStatus",
                table: "LoanApplications",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MaritalStatus",
                table: "LoanApplications",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "MaxLimit",
                table: "LoanApplications",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyExpenses",
                table: "LoanApplications",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "NationalId",
                table: "LoanApplications",
                type: "character varying(11)",
                maxLength: 11,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "NetLimit",
                table: "LoanApplications",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "ExternalBankLoans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NationalId = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: false),
                    BankName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    OriginalAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    RemainingDebt = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    MonthlyInstallment = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExternalBankLoans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ReferenceCreditRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Age = table.Column<int>(type: "integer", nullable: false),
                    MonthlyIncome = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    MonthlyExpenses = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    MaritalStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ChildrenCount = table.Column<int>(type: "integer", nullable: false),
                    HousingStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Profession = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    GrantedAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TermMonths = table.Column<int>(type: "integer", nullable: false),
                    Defaulted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferenceCreditRecords", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExternalBankLoans_NationalId",
                table: "ExternalBankLoans",
                column: "NationalId");

            migrationBuilder.CreateIndex(
                name: "IX_ReferenceCreditRecords_MonthlyIncome",
                table: "ReferenceCreditRecords",
                column: "MonthlyIncome");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExternalBankLoans");

            migrationBuilder.DropTable(
                name: "ReferenceCreditRecords");

            migrationBuilder.DropColumn(
                name: "NationalId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Age",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "AiReason",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "ChildrenCount",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "DecidedBy",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "EmploymentMonths",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "ExistingDebt",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "HousingStatus",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "MaritalStatus",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "MaxLimit",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "MonthlyExpenses",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "NationalId",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "NetLimit",
                table: "LoanApplications");
        }
    }
}
