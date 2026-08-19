using CatalogService.Api.Core.Domain;
using CatalogService.Api.Infrastructure.EntityConfigurations;
using Microsoft.EntityFrameworkCore;

namespace CatalogService.Api.Infrastructure.Context
{
    public class CatalogContext : DbContext
    {
        public const string DEFAULT_SCHEMA = "catalog";

        public CatalogContext(DbContextOptions<CatalogContext> options) : base(options)
        {
        }

        public DbSet<CatalogItem> CatalogItems { get; set; } = default!;

        public DbSet<CatalogBrand> CatalogBrands { get; set; } = default!;

        public DbSet<CatalogType> CatalogTypes { get; set; } = default!;

        public DbSet<Category> Categories { get; set; } = default!;

        public DbSet<ProductImage> ProductImages { get; set; } = default!;

        public DbSet<ProductVariant> ProductVariants { get; set; } = default!;

        public DbSet<ProductReview> ProductReviews { get; set; } = default!;

        public DbSet<Coupon> Coupons { get; set; } = default!;

        public DbSet<Campaign> Campaigns { get; set; } = default!;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            builder.ApplyConfiguration(new CatalogBrandEntityTypeConfiguration());
            builder.ApplyConfiguration(new CatalogItemEntityTypeConfiguration());
            builder.ApplyConfiguration(new CatalogTypeEntityTypeConfiguration());
            builder.ApplyConfiguration(new CategoryEntityTypeConfiguration());
            builder.ApplyConfiguration(new ProductImageEntityTypeConfiguration());
            builder.ApplyConfiguration(new ProductVariantEntityTypeConfiguration());
            builder.ApplyConfiguration(new ProductReviewEntityTypeConfiguration());
            builder.ApplyConfiguration(new CouponEntityTypeConfiguration());
            builder.ApplyConfiguration(new CampaignEntityTypeConfiguration());
        }
    }
}
