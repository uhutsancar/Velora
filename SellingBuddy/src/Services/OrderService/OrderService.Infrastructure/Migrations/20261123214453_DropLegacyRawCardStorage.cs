using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderService.Infrastructure.Migrations
{
    /// <summary>Irreversibly removes the legacy schema that could persist raw card data.</summary>
    public partial class DropLegacyRawCardStorage : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_orders_buyers_BuyerId",
                schema: "ordering",
                table: "orders");

            migrationBuilder.DropTable(name: "paymentmethods", schema: "ordering");
            migrationBuilder.DropTable(name: "buyers", schema: "ordering");
            migrationBuilder.DropTable(name: "cardtypes", schema: "ordering");

            migrationBuilder.DropIndex(
                name: "IX_orders_BuyerId",
                schema: "ordering",
                table: "orders");

            migrationBuilder.DropColumn(name: "BuyerId", schema: "ordering", table: "orders");
            migrationBuilder.DropColumn(name: "PaymentMethodId", schema: "ordering", table: "orders");
        }

        protected override void Down(MigrationBuilder migrationBuilder) =>
            throw new NotSupportedException(
                "This security migration is irreversible: raw-card storage must not be recreated.");
    }
}
