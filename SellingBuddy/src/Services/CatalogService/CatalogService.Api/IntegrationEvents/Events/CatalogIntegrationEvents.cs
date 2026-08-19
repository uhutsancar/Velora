using EventBus.Base.Events;

namespace CatalogService.Api.IntegrationEvents.Events
{
    /// <summary>Published whenever the effective selling price of a product changes.</summary>
    public class ProductPriceChangedIntegrationEvent : IntegrationEvent
    {
        public ProductPriceChangedIntegrationEvent()
        {
        }

        public ProductPriceChangedIntegrationEvent(int productId, decimal newPrice, decimal oldPrice)
        {
            ProductId = productId;
            NewPrice = newPrice;
            OldPrice = oldPrice;
        }

        public int ProductId { get; set; }

        public decimal NewPrice { get; set; }

        public decimal OldPrice { get; set; }
    }

    /// <summary>Published whenever the sellable stock of a product changes.</summary>
    public class ProductStockChangedIntegrationEvent : IntegrationEvent
    {
        public ProductStockChangedIntegrationEvent()
        {
        }

        public ProductStockChangedIntegrationEvent(int productId, int newStock, int oldStock)
        {
            ProductId = productId;
            NewStock = newStock;
            OldStock = oldStock;
        }

        public int ProductId { get; set; }

        public int NewStock { get; set; }

        public int OldStock { get; set; }
    }

    // ---- Contracts owned by other services, mirrored here so this service can subscribe ----

    /// <summary>
    /// Mirror of the event BasketService publishes at checkout. Property names must stay
    /// identical: the bus matches on the event name and deserialises by shape.
    /// </summary>
    public class OrderCreatedIntegrationEvent : IntegrationEvent
    {
        public string UserId { get; set; } = default!;

        public string UserName { get; set; } = default!;

        public string Buyer { get; set; } = default!;

        public CheckoutBasket Basket { get; set; } = new();
    }

    public class CheckoutBasket
    {
        public string BuyerId { get; set; } = default!;

        public List<CheckoutBasketItem> Items { get; set; } = new();
    }

    /// <summary>Mirror of the event OrderService publishes once payment succeeds.</summary>
    public class OrderPaidIntegrationEvent : IntegrationEvent
    {
        public Guid OrderId { get; set; }

        public string OrderNumber { get; set; } = default!;

        public string? UserId { get; set; }

        public string? CouponCode { get; set; }

        public decimal DiscountAmount { get; set; }

        public decimal TotalAmount { get; set; }
    }

    public class CheckoutBasketItem
    {
        public string? Id { get; set; }

        public int ProductId { get; set; }

        public string ProductName { get; set; } = default!;

        public decimal UnitPrice { get; set; }

        public int Quantity { get; set; }

        public string? PictureUrl { get; set; }

        /// <summary>Optional variant selected in the storefront.</summary>
        public int? VariantId { get; set; }
    }
}
