namespace OrderService.Domain.Models
{
    /// <summary>
    /// Basket snapshot carried by the OrderCreated integration event.
    /// Mirrors BasketService.Api.Core.Domain.Models.CustomerBasket.
    /// </summary>
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

        public string? CouponCode { get; set; }

        public decimal DiscountAmount { get; set; }
    }
}
