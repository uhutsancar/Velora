using OrderService.Domain.Exceptions;
using OrderService.Domain.SeedWork;
using System.ComponentModel.DataAnnotations;

namespace OrderService.Domain.AggregateModels.OrderAggregate
{
    public class OrderItem : BaseEntity, IValidatableObject
    {
        protected OrderItem()
        {
            Id = Guid.NewGuid();
        }

        public OrderItem(int productId, string productName, decimal unitPrice, string pictureUrl, int units = 1,
            int? variantId = null, string? variantLabel = null) : this()
        {
            if (units <= 0)
                throw new OrderingDomainException("Sipariş kalemi adedi sıfırdan büyük olmalı.");

            ProductId = productId;
            ProductName = productName;
            UnitPrice = unitPrice;
            Units = units;
            PictureUrl = pictureUrl;
            VariantId = variantId;
            VariantLabel = variantLabel;
        }

        public int ProductId { get; set; }

        public string ProductName { get; set; } = default!;

        public string? PictureUrl { get; set; }

        public decimal UnitPrice { get; set; }

        public int Units { get; set; }

        /// <summary>Catalogue variant that was purchased, when the product has variants.</summary>
        public int? VariantId { get; set; }

        public string? VariantLabel { get; set; }

        public decimal LineTotal => UnitPrice * Units;

        public void AddUnits(int units)
        {
            if (units < 0)
                throw new OrderingDomainException("Eklenecek adet negatif olamaz.");

            Units += units;
        }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            var results = new List<ValidationResult>();

            if (Units <= 0)
                results.Add(new ValidationResult("Invalid number of units", new[] { nameof(Units) }));

            return results;
        }
    }
}
