using CatalogService.Api.Core.Domain;
using CatalogService.Api.Infrastructure.EntityConfigurations;
using Microsoft.EntityFrameworkCore;
using EventBus.Base.Events;
using Newtonsoft.Json;

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

        public DbSet<StockReservation> StockReservations { get; set; } = default!;

        public DbSet<CouponRedemption> CouponRedemptions { get; set; } = default!;
        public DbSet<CatalogOutboxMessage> OutboxMessages { get; set; } = default!;

        public void Enqueue(IntegrationEvent integrationEvent)
        {
            OutboxMessages.Add(new CatalogOutboxMessage
            {
                Id = integrationEvent.Id,
                OccurredAtUtc = integrationEvent.CreatedDate,
                EventType = integrationEvent.GetType().AssemblyQualifiedName
                    ?? throw new InvalidOperationException("Integration event type has no assembly-qualified name."),
                Payload = JsonConvert.SerializeObject(integrationEvent)
            });
        }

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

            builder.Entity<StockReservation>(reservation =>
            {
                reservation.ToTable("stock_reservations", DEFAULT_SCHEMA);
                reservation.HasKey(item => item.Id);
                reservation.HasIndex(item => item.OrderId);
                reservation.HasIndex(item => new { item.OrderId, item.ProductId, item.VariantId })
                    .IsUnique()
                    .HasFilter(null);
                reservation.Property(item => item.Status).HasConversion<int>();
            });

            builder.Entity<CouponRedemption>(redemption =>
            {
                redemption.ToTable("coupon_redemptions", DEFAULT_SCHEMA);
                redemption.HasKey(item => item.Id);
                redemption.HasIndex(item => item.OrderId).IsUnique();
                redemption.HasIndex(item => new { item.UserId, item.CouponCode });
                redemption.Property(item => item.UserId).IsRequired().HasMaxLength(64);
                redemption.Property(item => item.CouponCode).IsRequired().HasMaxLength(64);
                redemption.Property(item => item.Status).HasConversion<int>();
            });

            builder.Entity<CatalogOutboxMessage>(message =>
            {
                message.ToTable("outbox_messages", DEFAULT_SCHEMA);
                message.HasKey(item => item.Id);
                message.HasIndex(item => new { item.ProcessedAtUtc, item.OccurredAtUtc });
                message.Property(item => item.EventType).IsRequired().HasMaxLength(1000);
                message.Property(item => item.Payload).IsRequired();
                message.Property(item => item.LastError).HasMaxLength(2000);
            });
        }
    }
}
