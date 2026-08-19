using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderService.Domain.AggregateModels.BuyerAggregate;
using OrderService.Infrastructure.Context;

namespace OrderService.Infrastructure.EntityConfigurations
{
    internal class PaymentMethodEntityConfiguration : IEntityTypeConfiguration<PaymentMethod>
    {
        public void Configure(EntityTypeBuilder<PaymentMethod> builder)
        {
            builder.ToTable("paymentmethods", OrderDbContext.DEFAULT_SCHEMA);

            builder.HasKey(p => p.Id);
            builder.Property(p => p.Id).HasColumnName("id").ValueGeneratedNever();

            builder.Ignore(p => p.DomainEvents);

            // Shadow FK must match the Buyer primary key type (Guid), not int.
            builder.Property<Guid>("BuyerId").IsRequired();
            builder.HasIndex("BuyerId");

            builder.Property(p => p.CardHolderName)
                .UsePropertyAccessMode(PropertyAccessMode.Field)
                .HasColumnName("CardHolderName")
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(p => p.Alias)
                .UsePropertyAccessMode(PropertyAccessMode.Field)
                .HasColumnName("Alias")
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(p => p.CardNumber)
                .UsePropertyAccessMode(PropertyAccessMode.Field)
                .HasColumnName("CardNumber")
                .HasMaxLength(25)
                .IsRequired();

            builder.Property(p => p.Expiration)
                .UsePropertyAccessMode(PropertyAccessMode.Field)
                .HasColumnName("Expiration")
                .IsRequired();

            builder.Property(p => p.CardTypeId)
                .UsePropertyAccessMode(PropertyAccessMode.Field)
                .HasColumnName("CardTypeId")
                .IsRequired();

            // The CVV is never persisted: it must not exist in the database at rest.
            builder.Ignore(p => p.SecurityNumber);

            builder.HasOne(p => p.CardType)
                .WithMany()
                .HasForeignKey(p => p.CardTypeId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
