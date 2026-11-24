using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CatalogService.Api.Infastructure.Migrations
{
    /// <inheritdoc />
    public partial class EnforceNonVariantReservationUniqueness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_stock_reservations_OrderId_ProductId_VariantId",
                schema: "catalog",
                table: "stock_reservations");

            migrationBuilder.CreateIndex(
                name: "IX_stock_reservations_OrderId_ProductId_VariantId",
                schema: "catalog",
                table: "stock_reservations",
                columns: new[] { "OrderId", "ProductId", "VariantId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_stock_reservations_OrderId_ProductId_VariantId",
                schema: "catalog",
                table: "stock_reservations");

            migrationBuilder.CreateIndex(
                name: "IX_stock_reservations_OrderId_ProductId_VariantId",
                schema: "catalog",
                table: "stock_reservations",
                columns: new[] { "OrderId", "ProductId", "VariantId" },
                unique: true,
                filter: "[VariantId] IS NOT NULL");
        }
    }
}
