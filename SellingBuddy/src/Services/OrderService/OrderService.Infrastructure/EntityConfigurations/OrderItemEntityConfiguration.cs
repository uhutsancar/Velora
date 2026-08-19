using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderService.Domain.AggregateModels.OrderAggregate;
using OrderService.Infrastructure.Context;

namespace OrderService.Infrastructure.EntityConfigurations
{
    internal class OrderItemEntityConfiguration : IEntityTypeConfiguration<OrderItem>
    {
        public void Configure(EntityTypeBuilder<OrderItem> builder)
        {
            builder.ToTable("orderItems", OrderDbContext.DEFAULT_SCHEMA);

            builder.HasKey(oi => oi.Id);
            builder.Property(oi => oi.Id).ValueGeneratedNever();

            builder.Ignore(oi => oi.DomainEvents);
            builder.Ignore(oi => oi.LineTotal);

            builder.Property(oi => oi.ProductName).IsRequired().HasMaxLength(200);
            builder.Property(oi => oi.PictureUrl).HasMaxLength(1000);
            builder.Property(oi => oi.VariantLabel).HasMaxLength(120);
            builder.Property(oi => oi.UnitPrice).HasColumnType("decimal(18,2)");

            // Shadow FK must match the Order primary key type (Guid), not int.
            builder.Property<Guid>("OrderId").IsRequired();

            builder.HasIndex("OrderId");
            builder.HasIndex(oi => oi.ProductId);
        }
    }
}
