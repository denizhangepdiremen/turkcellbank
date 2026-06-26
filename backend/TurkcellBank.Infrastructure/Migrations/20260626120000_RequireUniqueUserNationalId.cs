using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TurkcellBank.Infrastructure.Persistence;

#nullable disable

namespace TurkcellBank.Infrastructure.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260626120000_RequireUniqueUserNationalId")]
    public partial class RequireUniqueUserNationalId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                WITH duplicate_ids AS (
                    SELECT "NationalId"
                    FROM "Users"
                    WHERE "NationalId" IS NOT NULL AND "NationalId" <> ''
                    GROUP BY "NationalId"
                    HAVING COUNT(*) > 1
                ),
                candidates AS (
                    SELECT u."Id", u."CreatedAt"
                    FROM "Users" u
                    LEFT JOIN duplicate_ids d ON d."NationalId" = u."NationalId"
                    WHERE u."NationalId" IS NULL OR u."NationalId" = '' OR d."NationalId" IS NOT NULL
                ),
                bases AS (
                    SELECT "Id", (900000000 + ROW_NUMBER() OVER (ORDER BY "CreatedAt", "Id"))::text AS s
                    FROM candidates
                ),
                digits AS (
                    SELECT
                        "Id",
                        s,
                        substring(s from 1 for 1)::int AS d1,
                        substring(s from 2 for 1)::int AS d2,
                        substring(s from 3 for 1)::int AS d3,
                        substring(s from 4 for 1)::int AS d4,
                        substring(s from 5 for 1)::int AS d5,
                        substring(s from 6 for 1)::int AS d6,
                        substring(s from 7 for 1)::int AS d7,
                        substring(s from 8 for 1)::int AS d8,
                        substring(s from 9 for 1)::int AS d9
                    FROM bases
                ),
                checks AS (
                    SELECT
                        "Id",
                        s,
                        d1, d2, d3, d4, d5, d6, d7, d8, d9,
                        (((((d1 + d3 + d5 + d7 + d9) * 7) - (d2 + d4 + d6 + d8)) % 10 + 10) % 10) AS d10
                    FROM digits
                )
                UPDATE "Users" u
                SET "NationalId" = c.s || c.d10::text || ((c.d1 + c.d2 + c.d3 + c.d4 + c.d5 + c.d6 + c.d7 + c.d8 + c.d9 + c.d10) % 10)::text
                FROM checks c
                WHERE u."Id" = c."Id";
                """);

            migrationBuilder.AlterColumn<string>(
                name: "NationalId",
                table: "Users",
                type: "character varying(11)",
                maxLength: 11,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(11)",
                oldMaxLength: 11,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_NationalId",
                table: "Users",
                column: "NationalId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_NationalId",
                table: "Users");

            migrationBuilder.AlterColumn<string>(
                name: "NationalId",
                table: "Users",
                type: "character varying(11)",
                maxLength: 11,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(11)",
                oldMaxLength: 11);
        }
    }
}
