using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderService.Domain.AggregateModels.BuyerAggregate;
using OrderService.Infrastructure.Context;

namespace OrderService.Infrastructure.EntityConfigurations
{
    internal class BuyerEntityConfiguration : IEntityTypeConfiguration<Buyer>
    {
        public void Configure(EntityTypeBuilder<Buyer> builder)
        {
            builder.ToTable("buyers", OrderDbContext.DEFAULT_SCHEMA);

            builder.HasKey(b => b.Id);
            builder.Property(b => b.Id).ValueGeneratedNever();

            builder.Ignore(b => b.DomainEvents);

            builder.Property(b => b.Name)
                .HasColumnType("varchar(200)")
                .IsRequired();

            builder.HasIndex(b => b.Name);

            builder.HasMany(b => b.PaymentMethods)
                .WithOne()
                // Points at the shadow FK on PaymentMethod, not at its own primary key.
                .HasForeignKey("BuyerId")
                .OnDelete(DeleteBehavior.Cascade);

            builder.Metadata.FindNavigation(nameof(Buyer.PaymentMethods))!
                .SetPropertyAccessMode(PropertyAccessMode.Field);
        }
    }
}
