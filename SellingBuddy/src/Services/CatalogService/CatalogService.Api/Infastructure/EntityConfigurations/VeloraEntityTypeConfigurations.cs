using CatalogService.Api.Core.Domain;
using CatalogService.Api.Infrastructure.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CatalogService.Api.Infrastructure.EntityConfigurations
{
    class CategoryEntityTypeConfiguration : IEntityTypeConfiguration<Category>
    {
        public void Configure(EntityTypeBuilder<Category> builder)
        {
            builder.ToTable("Category", CatalogContext.DEFAULT_SCHEMA);

            builder.HasKey(c => c.Id);
            builder.Property(c => c.Id).UseHiLo("catalog_category_hilo").IsRequired();

            builder.Property(c => c.Name).IsRequired().HasMaxLength(150);
            builder.Property(c => c.Slug).IsRequired().HasMaxLength(170);
            builder.Property(c => c.Description).HasMaxLength(1000);
            builder.Property(c => c.ImageUrl).HasMaxLength(500);
            builder.Property(c => c.MetaTitle).HasMaxLength(200);
            builder.Property(c => c.MetaDescription).HasMaxLength(400);

            builder.HasIndex(c => c.Slug).IsUnique();

            builder.HasOne(c => c.Parent)
                .WithMany(c => c.Children)
                .HasForeignKey(c => c.ParentId)
                // Self-referencing cascade is not allowed by SQL Server.
                .OnDelete(DeleteBehavior.Restrict);
        }
    }

    class ProductImageEntityTypeConfiguration : IEntityTypeConfiguration<ProductImage>
    {
        public void Configure(EntityTypeBuilder<ProductImage> builder)
        {
            builder.ToTable("ProductImage", CatalogContext.DEFAULT_SCHEMA);

            builder.HasKey(i => i.Id);
            builder.Property(i => i.Id).UseHiLo("catalog_image_hilo").IsRequired();

            builder.Property(i => i.Url).IsRequired().HasMaxLength(1000);
            builder.Property(i => i.AltText).HasMaxLength(300);

            builder.HasIndex(i => new { i.CatalogItemId, i.DisplayOrder });
        }
    }

    class ProductVariantEntityTypeConfiguration : IEntityTypeConfiguration<ProductVariant>
    {
        public void Configure(EntityTypeBuilder<ProductVariant> builder)
        {
            builder.ToTable("ProductVariant", CatalogContext.DEFAULT_SCHEMA);

            builder.HasKey(v => v.Id);
            builder.Property(v => v.Id).UseHiLo("catalog_variant_hilo").IsRequired();

            builder.Property(v => v.Sku).IsRequired().HasMaxLength(64);
            builder.Property(v => v.Color).HasMaxLength(64);
            builder.Property(v => v.ColorHex).HasMaxLength(9);
            builder.Property(v => v.Size).HasMaxLength(32);
            builder.Property(v => v.PriceAdjustment).HasColumnType("decimal(18,2)");

            builder.HasIndex(v => v.Sku).IsUnique();
            builder.HasIndex(v => v.CatalogItemId);
        }
    }

    class ProductReviewEntityTypeConfiguration : IEntityTypeConfiguration<ProductReview>
    {
        public void Configure(EntityTypeBuilder<ProductReview> builder)
        {
            builder.ToTable("ProductReview", CatalogContext.DEFAULT_SCHEMA);

            builder.HasKey(r => r.Id);
            builder.Property(r => r.Id).UseHiLo("catalog_review_hilo").IsRequired();

            builder.Property(r => r.UserName).IsRequired().HasMaxLength(150);
            builder.Property(r => r.Title).HasMaxLength(200);
            builder.Property(r => r.Comment).IsRequired().HasMaxLength(2000);

            // One review per customer per product.
            builder.HasIndex(r => new { r.CatalogItemId, r.UserId }).IsUnique();
        }
    }

    class CouponEntityTypeConfiguration : IEntityTypeConfiguration<Coupon>
    {
        public void Configure(EntityTypeBuilder<Coupon> builder)
        {
            builder.ToTable("Coupon", CatalogContext.DEFAULT_SCHEMA);

            builder.HasKey(c => c.Id);
            builder.Property(c => c.Id).UseHiLo("catalog_coupon_hilo").IsRequired();

            builder.Property(c => c.Code).IsRequired().HasMaxLength(64);
            builder.Property(c => c.Description).HasMaxLength(500);
            builder.Property(c => c.DiscountValue).HasColumnType("decimal(18,2)");
            builder.Property(c => c.MinimumOrderAmount).HasColumnType("decimal(18,2)");
            builder.Property(c => c.MaxDiscountAmount).HasColumnType("decimal(18,2)");
            builder.Property(c => c.DiscountType).HasConversion<int>();

            builder.HasIndex(c => c.Code).IsUnique();
        }
    }

    class CampaignEntityTypeConfiguration : IEntityTypeConfiguration<Campaign>
    {
        public void Configure(EntityTypeBuilder<Campaign> builder)
        {
            builder.ToTable("Campaign", CatalogContext.DEFAULT_SCHEMA);

            builder.HasKey(c => c.Id);
            builder.Property(c => c.Id).UseHiLo("catalog_campaign_hilo").IsRequired();

            builder.Property(c => c.Name).IsRequired().HasMaxLength(200);
            builder.Property(c => c.Slug).IsRequired().HasMaxLength(220);
            builder.Property(c => c.Description).HasMaxLength(1000);
            builder.Property(c => c.ImageUrl).HasMaxLength(1000);
            builder.Property(c => c.BannerUrl).HasMaxLength(1000);
            builder.Property(c => c.CtaLabel).HasMaxLength(100);
            builder.Property(c => c.CtaUrl).HasMaxLength(500);
            builder.Property(c => c.DiscountPercentage).HasColumnType("decimal(5,2)");
            builder.Property(c => c.Placement).HasConversion<int>();

            builder.HasIndex(c => c.Slug).IsUnique();

            builder.HasOne(c => c.Category)
                .WithMany()
                .HasForeignKey(c => c.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
