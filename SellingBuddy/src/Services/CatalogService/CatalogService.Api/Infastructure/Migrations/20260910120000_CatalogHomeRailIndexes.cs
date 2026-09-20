using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CatalogService.Api.Infastructure.Migrations
{
    /// <summary>
    /// Adds the two composite indexes behind the storefront home page.
    /// </summary>
    /// <remarks>
    /// The home page opens with three product rails. Featured and best sellers
    /// both filter on IsPublished and order by SoldCount; new arrivals filters
    /// the same way and orders by CreatedAtUtc. The existing single-column
    /// indexes could not serve either combination, so every visit scanned the
    /// published catalogue and sorted it in memory.
    ///
    /// Written by hand rather than scaffolded: the schema change is two
    /// CreateIndex calls, and the model snapshot below it is updated to match.
    /// </remarks>
    [Migration("20260910120000_CatalogHomeRailIndexes")]
    public partial class CatalogHomeRailIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Catalog_Published_SoldCount",
                schema: "catalog",
                table: "Catalog",
                columns: new[] { "IsPublished", "SoldCount" });

            migrationBuilder.CreateIndex(
                name: "IX_Catalog_Published_CreatedAt",
                schema: "catalog",
                table: "Catalog",
                columns: new[] { "IsPublished", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Catalog_Published_SoldCount",
                schema: "catalog",
                table: "Catalog");

            migrationBuilder.DropIndex(
                name: "IX_Catalog_Published_CreatedAt",
                schema: "catalog",
                table: "Catalog");
        }
    }
}
