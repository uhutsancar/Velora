namespace CatalogService.Api.Core.Domain
{
    /// <summary>
    /// Sellable variation of a product (colour / size). Stock is tracked per variant;
    /// products without variants fall back to <see cref="CatalogItem.AvailableStock"/>.
    /// </summary>
    public class ProductVariant
    {
        public int Id { get; set; }

        public int CatalogItemId { get; set; }

        public CatalogItem CatalogItem { get; set; } = default!;

        public string Sku { get; set; } = default!;

        public string? Color { get; set; }

        /// <summary>Hex swatch shown on the product card, e.g. "#1B1B1F".</summary>
        public string? ColorHex { get; set; }

        public string? Size { get; set; }

        /// <summary>Added to the product price; can be negative.</summary>
        public decimal PriceAdjustment { get; set; }

        public int Stock { get; set; }

        public bool IsActive { get; set; } = true;

        public int DisplayOrder { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
