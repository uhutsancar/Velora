using CatalogService.Api.Core.Domain;
using System.ComponentModel.DataAnnotations;

namespace CatalogService.Api.Core.Application.Dtos
{
    public class CategoryDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = default!;
        public string Slug { get; set; } = default!;
        public string? Description { get; set; }
        public int? ParentId { get; set; }
        public string? ImageUrl { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
        public bool IsFeatured { get; set; }
        public string? MetaTitle { get; set; }
        public string? MetaDescription { get; set; }
        public int ProductCount { get; set; }
        public IReadOnlyCollection<CategoryDto> Children { get; set; } = Array.Empty<CategoryDto>();
    }

    public class CategoryRequest
    {
        [Required, MaxLength(150)]
        public string Name { get; set; } = default!;

        [MaxLength(170)]
        public string? Slug { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        public int? ParentId { get; set; }

        [MaxLength(500)]
        public string? ImageUrl { get; set; }

        public int DisplayOrder { get; set; }

        public bool IsActive { get; set; } = true;

        public bool IsFeatured { get; set; }

        [MaxLength(200)]
        public string? MetaTitle { get; set; }

        [MaxLength(400)]
        public string? MetaDescription { get; set; }
    }

    public class BrandDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = default!;
        public string? Slug { get; set; }
        public string? Description { get; set; }
        public string? LogoUrl { get; set; }
        public bool IsActive { get; set; }
        public bool IsFeatured { get; set; }
        public int DisplayOrder { get; set; }
        public int ProductCount { get; set; }
    }

    public class BrandRequest
    {
        [Required, MaxLength(100)]
        public string Name { get; set; } = default!;

        [MaxLength(120)]
        public string? Slug { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        [MaxLength(500)]
        public string? LogoUrl { get; set; }

        public bool IsActive { get; set; } = true;

        public bool IsFeatured { get; set; }

        public int DisplayOrder { get; set; }
    }

    public class ReviewDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string? ProductName { get; set; }
        public string UserName { get; set; } = default!;
        public int Rating { get; set; }
        public string? Title { get; set; }
        public string Comment { get; set; } = default!;
        public bool IsApproved { get; set; }
        public DateTime CreatedAtUtc { get; set; }
    }

    public class CreateReviewRequest
    {
        [Range(1, 5)]
        public int Rating { get; set; }

        [MaxLength(200)]
        public string? Title { get; set; }

        [Required, MinLength(5), MaxLength(2000)]
        public string Comment { get; set; } = default!;
    }

    public class ReviewSummaryDto
    {
        public decimal Average { get; set; }
        public int Total { get; set; }

        /// <summary>Star value (1-5) to review count.</summary>
        public IDictionary<int, int> Distribution { get; set; } = new Dictionary<int, int>();
    }

    public class CouponDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = default!;
        public string? Description { get; set; }
        public DiscountType DiscountType { get; set; }
        public decimal DiscountValue { get; set; }
        public decimal MinimumOrderAmount { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public int? UsageLimit { get; set; }
        public int UsedCount { get; set; }
        public int PerUserLimit { get; set; }
        public DateTime StartsAtUtc { get; set; }
        public DateTime EndsAtUtc { get; set; }
        public bool IsActive { get; set; }
    }

    public class CouponRequest
    {
        [Required, MaxLength(64)]
        public string Code { get; set; } = default!;

        [MaxLength(500)]
        public string? Description { get; set; }

        public DiscountType DiscountType { get; set; }

        [Range(0, 1_000_000)]
        public decimal DiscountValue { get; set; }

        [Range(0, 1_000_000)]
        public decimal MinimumOrderAmount { get; set; }

        [Range(0, 1_000_000)]
        public decimal? MaxDiscountAmount { get; set; }

        public int? UsageLimit { get; set; }

        [Range(1, 100)]
        public int PerUserLimit { get; set; } = 1;

        public DateTime StartsAtUtc { get; set; }

        public DateTime EndsAtUtc { get; set; }

        public bool IsActive { get; set; } = true;
    }

    /// <summary>Result of validating a coupon against a basket subtotal.</summary>
    public class CouponValidationResult
    {
        public bool IsValid { get; set; }
        public string? Code { get; set; }
        public string? Message { get; set; }
        public decimal DiscountAmount { get; set; }
        public DiscountType? DiscountType { get; set; }
        public decimal? DiscountValue { get; set; }
    }

    public class ValidateCouponRequest
    {
        [Required, MaxLength(64)]
        public string Code { get; set; } = default!;

        [Range(0, 10_000_000)]
        public decimal Subtotal { get; set; }
    }

    public class CampaignDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = default!;
        public string Slug { get; set; } = default!;
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string? BannerUrl { get; set; }
        public string? CtaLabel { get; set; }
        public string? CtaUrl { get; set; }
        public decimal DiscountPercentage { get; set; }
        public int? CategoryId { get; set; }
        public string? CategorySlug { get; set; }
        public CampaignPlacement Placement { get; set; }
        public DateTime StartsAtUtc { get; set; }
        public DateTime EndsAtUtc { get; set; }
        public bool IsActive { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class CampaignRequest
    {
        [Required, MaxLength(200)]
        public string Name { get; set; } = default!;

        [MaxLength(220)]
        public string? Slug { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        [MaxLength(1000)]
        public string? ImageUrl { get; set; }

        [MaxLength(1000)]
        public string? BannerUrl { get; set; }

        [MaxLength(100)]
        public string? CtaLabel { get; set; }

        [MaxLength(500)]
        public string? CtaUrl { get; set; }

        [Range(0, 100)]
        public decimal DiscountPercentage { get; set; }

        public int? CategoryId { get; set; }

        public CampaignPlacement Placement { get; set; } = CampaignPlacement.Home;

        public DateTime StartsAtUtc { get; set; }

        public DateTime EndsAtUtc { get; set; }

        public bool IsActive { get; set; } = true;

        public int DisplayOrder { get; set; }
    }

    /// <summary>Catalogue KPIs consumed by the admin dashboard.</summary>
    public class CatalogStatsDto
    {
        public int TotalProducts { get; set; }
        public int PublishedProducts { get; set; }
        public int OutOfStockProducts { get; set; }
        public int LowStockProducts { get; set; }
        public int TotalCategories { get; set; }
        public int TotalBrands { get; set; }
        public int ActiveCoupons { get; set; }
        public int PendingReviews { get; set; }
        public decimal InventoryValue { get; set; }
        public decimal PotentialMargin { get; set; }
        public IReadOnlyCollection<ProductListItemDto> LowStockItems { get; set; } = Array.Empty<ProductListItemDto>();
        public IReadOnlyCollection<CategoryProductCountDto> ProductsByCategory { get; set; } = Array.Empty<CategoryProductCountDto>();
    }

    public class CategoryProductCountDto
    {
        public string Category { get; set; } = default!;
        public int Count { get; set; }
    }
}
