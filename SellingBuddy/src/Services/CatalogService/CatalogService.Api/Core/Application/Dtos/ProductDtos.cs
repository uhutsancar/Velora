using System.ComponentModel.DataAnnotations;

namespace CatalogService.Api.Core.Application.Dtos
{
    /// <summary>Card-sized projection used by listings, search and carousels.</summary>
    public class ProductListItemDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = default!;
        public string Slug { get; set; } = default!;
        public string? ShortDescription { get; set; }
        public decimal Price { get; set; }
        public decimal? DiscountPrice { get; set; }
        public decimal EffectivePrice { get; set; }
        public int DiscountPercentage { get; set; }
        public string? PrimaryImageUrl { get; set; }
        public string? HoverImageUrl { get; set; }
        public string? BrandName { get; set; }
        public string? BrandSlug { get; set; }
        public string? CategoryName { get; set; }
        public string? CategorySlug { get; set; }
        public decimal RatingAverage { get; set; }
        public int RatingCount { get; set; }
        public int TotalStock { get; set; }
        public bool InStock { get; set; }
        public bool IsFeatured { get; set; }
        public bool IsNew { get; set; }
        public IReadOnlyCollection<string> Tags { get; set; } = Array.Empty<string>();
        public IReadOnlyCollection<ProductSwatchDto> Swatches { get; set; } = Array.Empty<ProductSwatchDto>();
    }

    public class ProductSwatchDto
    {
        public string? Color { get; set; }
        public string? ColorHex { get; set; }
    }

    /// <summary>Full product payload for the detail page.</summary>
    public class ProductDetailDto : ProductListItemDto
    {
        public string Description { get; set; } = default!;
        public string? Sku { get; set; }
        public string? MetaTitle { get; set; }
        public string? MetaDescription { get; set; }
        public bool IsPublished { get; set; }
        public int SoldCount { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public int? CategoryId { get; set; }
        public int CatalogBrandId { get; set; }
        public int CatalogTypeId { get; set; }
        public IReadOnlyCollection<ProductImageDto> Images { get; set; } = Array.Empty<ProductImageDto>();
        public IReadOnlyCollection<ProductVariantDto> Variants { get; set; } = Array.Empty<ProductVariantDto>();
        public IReadOnlyCollection<CategoryBreadcrumbDto> Breadcrumbs { get; set; } = Array.Empty<CategoryBreadcrumbDto>();
    }

    /// <summary>Adds cost/margin fields that must never reach the storefront.</summary>
    public class AdminProductDetailDto : ProductDetailDto
    {
        public decimal? CostPrice { get; set; }
        public int AvailableStock { get; set; }
        public int RestockThreshold { get; set; }
        public string? Barcode { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
    }

    public class ProductImageDto
    {
        public int Id { get; set; }
        public string Url { get; set; } = default!;
        public string? AltText { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsPrimary { get; set; }
    }

    public class ProductVariantDto
    {
        public int Id { get; set; }
        public string Sku { get; set; } = default!;
        public string? Color { get; set; }
        public string? ColorHex { get; set; }
        public string? Size { get; set; }
        public decimal PriceAdjustment { get; set; }
        public decimal Price { get; set; }
        public int Stock { get; set; }
        public bool IsActive { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class CategoryBreadcrumbDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = default!;
        public string Slug { get; set; } = default!;
    }

    /// <summary>Filter facets returned next to a product list so the UI can build filters from real data.</summary>
    public class ProductFacetsDto
    {
        public decimal MinPrice { get; set; }
        public decimal MaxPrice { get; set; }
        public IReadOnlyCollection<FacetValueDto> Brands { get; set; } = Array.Empty<FacetValueDto>();
        public IReadOnlyCollection<FacetValueDto> Categories { get; set; } = Array.Empty<FacetValueDto>();
        public IReadOnlyCollection<FacetValueDto> Colors { get; set; } = Array.Empty<FacetValueDto>();
        public IReadOnlyCollection<FacetValueDto> Sizes { get; set; } = Array.Empty<FacetValueDto>();
    }

    public class FacetValueDto
    {
        public string Value { get; set; } = default!;
        public string Label { get; set; } = default!;
        public int Count { get; set; }
    }

    public enum ProductSort
    {
        Newest = 0,
        PriceAsc = 1,
        PriceDesc = 2,
        Rating = 3,
        BestSelling = 4,
        NameAsc = 5
    }

    /// <summary>Storefront product query. Bound from the query string.</summary>
    public class ProductQuery
    {
        private int pageSize = 12;

        public string? Search { get; set; }
        public string? Category { get; set; }
        public string? Brand { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public string? Color { get; set; }
        public string? Size { get; set; }
        public string? Tag { get; set; }
        public bool? InStock { get; set; }
        public bool? OnSale { get; set; }
        public bool? Featured { get; set; }
        public int? MinRating { get; set; }
        public ProductSort Sort { get; set; } = ProductSort.Newest;
        public int PageIndex { get; set; }

        public int PageSize
        {
            get => pageSize;
            set => pageSize = value <= 0 ? 12 : Math.Min(value, 60);
        }
    }

    /// <summary>Admin product query: can also see unpublished products.</summary>
    public class AdminProductQuery : ProductQuery
    {
        public bool? Published { get; set; }
        public bool? LowStock { get; set; }
    }

    public class ProductImageRequest
    {
        [Required, MaxLength(1000)]
        public string Url { get; set; } = default!;

        [MaxLength(300)]
        public string? AltText { get; set; }

        public int DisplayOrder { get; set; }

        public bool IsPrimary { get; set; }
    }

    public class ProductVariantRequest
    {
        public int? Id { get; set; }

        [MaxLength(64)]
        public string? Sku { get; set; }

        [MaxLength(64)]
        public string? Color { get; set; }

        [MaxLength(9)]
        public string? ColorHex { get; set; }

        [MaxLength(32)]
        public string? Size { get; set; }

        public decimal PriceAdjustment { get; set; }

        [Range(0, int.MaxValue)]
        public int Stock { get; set; }

        public bool IsActive { get; set; } = true;

        public int DisplayOrder { get; set; }
    }

    public class CreateProductRequest
    {
        [Required, MaxLength(200)]
        public string Name { get; set; } = default!;

        [MaxLength(220)]
        public string? Slug { get; set; }

        [Required, MaxLength(4000)]
        public string Description { get; set; } = default!;

        [MaxLength(500)]
        public string? ShortDescription { get; set; }

        [Range(0.01, 9_999_999)]
        public decimal Price { get; set; }

        [Range(0, 9_999_999)]
        public decimal? DiscountPrice { get; set; }

        [Range(0, 9_999_999)]
        public decimal? CostPrice { get; set; }

        [MaxLength(64)]
        public string? Sku { get; set; }

        [MaxLength(64)]
        public string? Barcode { get; set; }

        public int? CategoryId { get; set; }

        [Range(1, int.MaxValue)]
        public int CatalogBrandId { get; set; }

        [Range(1, int.MaxValue)]
        public int CatalogTypeId { get; set; }

        [Range(0, int.MaxValue)]
        public int AvailableStock { get; set; }

        [Range(0, int.MaxValue)]
        public int RestockThreshold { get; set; } = 5;

        public bool IsPublished { get; set; } = true;

        public bool IsFeatured { get; set; }

        [MaxLength(200)]
        public string? MetaTitle { get; set; }

        [MaxLength(400)]
        public string? MetaDescription { get; set; }

        public List<string> Tags { get; set; } = new();

        public List<ProductImageRequest> Images { get; set; } = new();

        public List<ProductVariantRequest> Variants { get; set; } = new();
    }

    public class UpdateProductRequest : CreateProductRequest
    {
    }

    public class UpdateStockRequest
    {
        [Range(0, int.MaxValue)]
        public int AvailableStock { get; set; }

        public List<ProductVariantStockRequest> Variants { get; set; } = new();
    }

    public class ProductVariantStockRequest
    {
        public int Id { get; set; }

        [Range(0, int.MaxValue)]
        public int Stock { get; set; }
    }

    public class UpdatePricingRequest
    {
        [Range(0.01, 9_999_999)]
        public decimal Price { get; set; }

        [Range(0, 9_999_999)]
        public decimal? DiscountPrice { get; set; }
    }

    public class UpdatePublishStateRequest
    {
        public bool IsPublished { get; set; }
    }

    public class ReorderImagesRequest
    {
        [Required]
        public List<int> ImageIds { get; set; } = new();
    }
}
