namespace OrderService.Domain.Models
{
    /// <summary>
    /// Basket line as it arrives on the OrderCreated integration event.
    /// The shape mirrors BasketService.Api.Core.Domain.Models.BasketItem.
    /// </summary>
    public class BasketItem
    {
        public string? Id { get; init; }

        public int ProductId { get; init; }

        public string ProductName { get; init; } = default!;

        public decimal UnitPrice { get; init; }

        public decimal OldUnitPrice { get; init; }

        public int Quantity { get; init; }

        public string? PictureUrl { get; init; }

        public string? Slug { get; init; }

        public int? VariantId { get; init; }

        public string? VariantLabel { get; init; }
    }
}
