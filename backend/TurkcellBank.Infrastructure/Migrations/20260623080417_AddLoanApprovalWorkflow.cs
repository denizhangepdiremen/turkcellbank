using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TurkcellBank.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLoanApprovalWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DecidedByUserId",
                table: "LoanApplications",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DecisionNote",
                table: "LoanApplications",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RecommendedStatus",
                table: "LoanApplications",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RequiredApproverRole",
                table: "LoanApplications",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_LoanApplications_Status",
                table: "LoanApplications",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LoanApplications_Status",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "DecidedByUserId",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "DecisionNote",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "RecommendedStatus",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "RequiredApproverRole",
                table: "LoanApplications");
        }
    }
}
