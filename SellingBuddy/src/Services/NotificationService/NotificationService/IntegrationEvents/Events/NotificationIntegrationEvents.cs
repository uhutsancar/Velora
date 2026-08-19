using EventBus.Base.Events;

namespace NotificationService.IntegrationEvents.Events
{
    /// <summary>Mirror of the PaymentService success contract.</summary>
    public class OrderPaymentSuccessIntegrationEvent : IntegrationEvent
    {
        public Guid OrderId { get; set; }

        public string? OrderNumber { get; set; }

        public decimal TotalAmount { get; set; }
    }

    /// <summary>Mirror of the PaymentService failure contract.</summary>
    public class OrderPaymentFailedIntegrationEvent : IntegrationEvent
    {
        public Guid OrderId { get; set; }

        public string? OrderNumber { get; set; }

        public string ErrorMessage { get; set; } = default!;
    }

    /// <summary>Mirror of the OrderService status change contract.</summary>
    public class OrderStatusChangedIntegrationEvent : IntegrationEvent
    {
        public Guid OrderId { get; set; }

        public int StatusId { get; set; }

        public string StatusName { get; set; } = default!;

        public string? UserId { get; set; }

        public string? UserName { get; set; }
    }

    /// <summary>Mirror of the OrderService payment-completed contract.</summary>
    public class OrderPaidIntegrationEvent : IntegrationEvent
    {
        public Guid OrderId { get; set; }

        public string OrderNumber { get; set; } = default!;

        public string? UserId { get; set; }

        public string? CouponCode { get; set; }

        public decimal DiscountAmount { get; set; }

        public decimal TotalAmount { get; set; }
    }

    /// <summary>Mirror of the CatalogService stock contract, used for low-stock alerts.</summary>
    public class ProductStockChangedIntegrationEvent : IntegrationEvent
    {
        public int ProductId { get; set; }

        public int NewStock { get; set; }

        public int OldStock { get; set; }
    }
}
