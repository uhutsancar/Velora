using CatalogService.Api.Core.Domain;
using CatalogService.Api.Infrastructure.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CatalogService.Api.Infrastructure.EntityConfigurations
{
    class CatalogItemEntityTypeConfiguration : IEntityTypeConfiguration<CatalogItem>
    {
        public void Configure(EntityTypeBuilder<CatalogItem> builder)
        {
            builder.ToTable("Catalog", CatalogContext.DEFAULT_SCHEMA);

            builder.Property(ci => ci.Id)
                .UseHiLo("catalog_hilo")
                .IsRequired();

            builder.Property(ci => ci.Name)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(ci => ci.Slug)
                .IsRequired()
                .HasMaxLength(220);

            builder.Property(ci => ci.Description)
                .HasMaxLength(4000);

            builder.Property(ci => ci.ShortDescription)
                .HasMaxLength(500);

            builder.Property(ci => ci.Price)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(ci => ci.DiscountPrice).HasColumnType("decimal(18,2)");
            builder.Property(ci => ci.CostPrice).HasColumnType("decimal(18,2)");
            builder.Property(ci => ci.RatingAverage).HasColumnType("decimal(3,2)");

            builder.Property(ci => ci.Sku).HasMaxLength(64);
            builder.Property(ci => ci.Barcode).HasMaxLength(64);
            builder.Property(ci => ci.MetaTitle).HasMaxLength(200);
            builder.Property(ci => ci.MetaDescription).HasMaxLength(400);
            builder.Property(ci => ci.Tags).HasMaxLength(500);

            builder.Property(ci => ci.PictureFileName).IsRequired(false);

            // Computed in code from the other columns; never persisted.
            builder.Ignore(ci => ci.PictureUri);
            builder.Ignore(ci => ci.EffectivePrice);
            builder.Ignore(ci => ci.HasDiscount);
            builder.Ignore(ci => ci.DiscountPercentage);
            builder.Ignore(ci => ci.TotalStock);

            // Slug is the storefront URL key, so it has to be unique and indexed.
            builder.HasIndex(ci => ci.Slug).IsUnique();
            builder.HasIndex(ci => new { ci.IsPublished, ci.CategoryId });
            builder.HasIndex(ci => ci.IsFeatured);
            builder.HasIndex(ci => ci.CreatedAtUtc);

            builder.HasOne(ci => ci.CatalogBrand)
                .WithMany()
                .HasForeignKey(ci => ci.CatalogBrandId);

            builder.HasOne(ci => ci.CatalogType)
                .WithMany()
                .HasForeignKey(ci => ci.CatalogTypeId);

            builder.HasOne(ci => ci.Category)
                .WithMany(c => c.Products)
                .HasForeignKey(ci => ci.CategoryId)
                // Deleting a category must never cascade into products.
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasMany(ci => ci.Images)
                .WithOne(i => i.CatalogItem)
                .HasForeignKey(i => i.CatalogItemId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(ci => ci.Variants)
                .WithOne(v => v.CatalogItem)
                .HasForeignKey(v => v.CatalogItemId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(ci => ci.Reviews)
                .WithOne(r => r.CatalogItem)
                .HasForeignKey(r => r.CatalogItemId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
