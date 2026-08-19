using System.ComponentModel.DataAnnotations;

namespace BasketService.Api.Core.Domain.Models
{
    public class BasketItem : IValidatableObject
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public int ProductId { get; set; }

        public string ProductName { get; set; } = default!;

        public decimal UnitPrice { get; set; }

        public decimal OldUnitPrice { get; set; }

        public int Quantity { get; set; }

        public string PictureUrl { get; set; } = default!;

        // ---------- Velora additions ----------

        /// <summary>Storefront URL key, so the cart can link back to the product page.</summary>
        public string? Slug { get; set; }

        /// <summary>Selected variant; null when the product is sold without variants.</summary>
        public int? VariantId { get; set; }

        /// <summary>Human readable variant, e.g. "Siyah / 100".</summary>
        public string? VariantLabel { get; set; }

        /// <summary>Stock available at the time the line was added, used for UI hints.</summary>
        public int AvailableStock { get; set; }

        public decimal LineTotal => UnitPrice * Quantity;

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            var results = new List<ValidationResult>();

            if (Quantity < 1)
                results.Add(new ValidationResult("Invalid number of units", new[] { nameof(Quantity) }));

            if (UnitPrice < 0)
                results.Add(new ValidationResult("Unit price cannot be negative", new[] { nameof(UnitPrice) }));

            return results;
        }

        /// <summary>Two lines merge when they point at the same product and variant.</summary>
        public bool IsSameLine(BasketItem other) =>
            ProductId == other.ProductId && VariantId == other.VariantId;
    }
}
