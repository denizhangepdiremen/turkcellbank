using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TurkcellBank.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCreditCardPhaseTwo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastInterestAppliedAt",
                table: "CreditCardStatements",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalInterestApplied",
                table: "CreditCardStatements",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "CreditCardLimitIncreaseRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreditCardId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrentLimit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    RequestedLimit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    RecommendedLimit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Age = table.Column<int>(type: "integer", nullable: false),
                    MaritalStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ChildrenCount = table.Column<int>(type: "integer", nullable: false),
                    HousingStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Income = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    MonthlyExpenses = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    EmploymentMonths = table.Column<int>(type: "integer", nullable: false),
                    Profession = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: false),
                    AiReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    DecidedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DecidedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Channel = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PerformedByEmployeeId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CreditCardLimitIncreaseRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CreditCardLimitIncreaseRequests_CreditCards_CreditCardId",
                        column: x => x.CreditCardId,
                        principalTable: "CreditCards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CreditCardLimitIncreaseRequests_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CreditCardStatements_Status_DueDate_LastInterestAppliedAt",
                table: "CreditCardStatements",
                columns: new[] { "Status", "DueDate", "LastInterestAppliedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CreditCardLimitIncreaseRequests_CreditCardId",
                table: "CreditCardLimitIncreaseRequests",
                column: "CreditCardId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditCardLimitIncreaseRequests_Status_CreatedAt",
                table: "CreditCardLimitIncreaseRequests",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CreditCardLimitIncreaseRequests_UserId",
                table: "CreditCardLimitIncreaseRequests",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CreditCardLimitIncreaseRequests");

            migrationBuilder.DropIndex(
                name: "IX_CreditCardStatements_Status_DueDate_LastInterestAppliedAt",
                table: "CreditCardStatements");

            migrationBuilder.DropColumn(
                name: "LastInterestAppliedAt",
                table: "CreditCardStatements");

            migrationBuilder.DropColumn(
                name: "TotalInterestApplied",
                table: "CreditCardStatements");
        }
    }
}
