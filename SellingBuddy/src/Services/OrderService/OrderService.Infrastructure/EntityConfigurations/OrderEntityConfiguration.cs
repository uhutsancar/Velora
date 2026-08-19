using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderService.Domain.AggregateModels.OrderAggregate;
using OrderService.Infrastructure.Context;

namespace OrderService.Infrastructure.EntityConfigurations
{
    public class OrderEntityConfiguration : IEntityTypeConfiguration<Order>
    {
        public void Configure(EntityTypeBuilder<Order> builder)
        {
            builder.ToTable("orders", OrderDbContext.DEFAULT_SCHEMA);

            builder.HasKey(o => o.Id);
            builder.Property(o => o.Id).ValueGeneratedNever();

            builder.Ignore(o => o.DomainEvents);
            builder.Ignore(o => o.OrderStatusId);

            builder.Property(o => o.OrderNumber).IsRequired().HasMaxLength(32);
            builder.Property(o => o.UserId).HasMaxLength(64);
            builder.Property(o => o.UserName).HasMaxLength(200);
            builder.Property(o => o.Description).HasMaxLength(500);
            builder.Property(o => o.CancelReason).HasMaxLength(500);
            builder.Property(o => o.CouponCode).HasMaxLength(64);
            builder.Property(o => o.TotalAmount).HasColumnType("decimal(18,2)");
            builder.Property(o => o.DiscountAmount).HasColumnType("decimal(18,2)");

            builder.HasIndex(o => o.OrderNumber).IsUnique();
            builder.HasIndex(o => o.UserId);
            builder.HasIndex(o => o.OrderDate);

            builder.OwnsOne(o => o.Address, address =>
            {
                address.WithOwner();
                address.Property(a => a.Street).HasMaxLength(256);
                address.Property(a => a.City).HasMaxLength(128);
                address.Property(a => a.State).HasMaxLength(128);
                address.Property(a => a.Country).HasMaxLength(128);
                address.Property(a => a.ZipCode).HasMaxLength(16);
            });

            builder.Property<int>("orderStatusId")
                .UsePropertyAccessMode(PropertyAccessMode.Field)
                .HasColumnName("OrderStatusId")
                .IsRequired();

            builder.Metadata.FindNavigation(nameof(Order.OrderItems))!
                .SetPropertyAccessMode(PropertyAccessMode.Field);

            builder.HasOne(o => o.Buyer)
                .WithMany()
                .HasForeignKey(o => o.BuyerId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(o => o.OrderStatus)
                .WithMany()
                .HasForeignKey("orderStatusId")
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
