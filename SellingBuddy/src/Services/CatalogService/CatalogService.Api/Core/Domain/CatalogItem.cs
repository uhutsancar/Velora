namespace CatalogService.Api.Core.Domain
{
    /// <summary>
    /// The Velora product. Original eShop fields are preserved so the legacy
    /// /api/catalog endpoints keep their contract; everything below them is new.
    /// </summary>
    public class CatalogItem
    {
        public int Id { get; set; }

        public string Name { get; set; } = default!;

        public string Description { get; set; } = default!;

        public decimal Price { get; set; }

        public string PictureFileName { get; set; } = default!;

        public string PictureUri { get; set; } = default!;

        public int CatalogTypeId { get; set; }

        public CatalogType CatalogType { get; set; } = default!;

        public int CatalogBrandId { get; set; }

        public CatalogBrand CatalogBrand { get; set; } = default!;

        public int AvailableStock { get; set; }

        public bool OnReorder { get; set; }

        // ---------- Velora commerce fields ----------

        /// <summary>SEO friendly unique identifier used in storefront URLs.</summary>
        public string Slug { get; set; } = default!;

        public string? ShortDescription { get; set; }

        /// <summary>Active sale price. When set (and lower than Price) the storefront shows a discount.</summary>
        public decimal? DiscountPrice { get; set; }

        /// <summary>Purchase cost, used for the margin metrics in the admin dashboard. Never exposed publicly.</summary>
        public decimal? CostPrice { get; set; }

        public string? Sku { get; set; }

        public string? Barcode { get; set; }

        public int? CategoryId { get; set; }

        public Category? Category { get; set; }

        public bool IsPublished { get; set; } = true;

        public bool IsFeatured { get; set; }

        /// <summary>Below this level the admin dashboard flags the product as low stock.</summary>
        public int RestockThreshold { get; set; } = 5;

        public string? MetaTitle { get; set; }

        public string? MetaDescription { get; set; }

        /// <summary>Comma separated tag list, e.g. "yeni,indirim,deri".</summary>
        public string? Tags { get; set; }

        public decimal RatingAverage { get; set; }

        public int RatingCount { get; set; }

        public int SoldCount { get; set; }

        public int ViewCount { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAtUtc { get; set; }

        public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();

        public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();

        public ICollection<ProductReview> Reviews { get; set; } = new List<ProductReview>();

        /// <summary>Price the customer actually pays.</summary>
        public decimal EffectivePrice => DiscountPrice is > 0 && DiscountPrice < Price ? DiscountPrice.Value : Price;

        public bool HasDiscount => DiscountPrice is > 0 && DiscountPrice < Price;

        public int DiscountPercentage => HasDiscount && Price > 0
            ? (int)Math.Round((Price - DiscountPrice!.Value) / Price * 100)
            : 0;

        /// <summary>Total stock: variant stock when the product has variants, otherwise the item stock.</summary>
        public int TotalStock => Variants.Count > 0 ? Variants.Where(v => v.IsActive).Sum(v => v.Stock) : AvailableStock;
    }
}
