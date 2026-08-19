namespace BasketService.Api.Core.Domain.Models
{
    public class CustomerBasket
    {
        public CustomerBasket()
        {
        }

        public CustomerBasket(string customerId)
        {
            BuyerId = customerId;
        }

        public string BuyerId { get; set; } = default!;

        public List<BasketItem> Items { get; set; } = new();

        /// <summary>Coupon applied to the basket; validated against CatalogService at checkout.</summary>
        public string? CouponCode { get; set; }

        /// <summary>Discount amount as computed by CatalogService when the coupon was applied.</summary>
        public decimal DiscountAmount { get; set; }

        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

        public decimal Subtotal => Items.Sum(i => i.UnitPrice * i.Quantity);

        public int TotalQuantity => Items.Sum(i => i.Quantity);

        /// <summary>Never let a stale coupon push the payable amount below zero.</summary>
        public decimal Total => Math.Max(0, Subtotal - DiscountAmount);
    }

    /// <summary>Durable favourites list, stored next to the basket in Redis.</summary>
    public class CustomerWishlist
    {
        public CustomerWishlist()
        {
        }

        public CustomerWishlist(string customerId)
        {
            BuyerId = customerId;
        }

        public string BuyerId { get; set; } = default!;

        public List<int> ProductIds { get; set; } = new();

        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
