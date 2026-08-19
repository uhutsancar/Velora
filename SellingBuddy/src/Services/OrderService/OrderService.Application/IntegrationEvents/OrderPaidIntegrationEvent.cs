using EventBus.Base.Events;

namespace OrderService.Application.IntegrationEvents
{
    /// <summary>
    /// Broadcast when an order is paid. CatalogService consumes it to redeem the coupon;
    /// NotificationService could use it for the receipt e-mail.
    /// </summary>
    public class OrderPaidIntegrationEvent : IntegrationEvent
    {
        public OrderPaidIntegrationEvent()
        {
        }

        public OrderPaidIntegrationEvent(
            Guid orderId,
            string orderNumber,
            string? userId,
            string? couponCode,
            decimal discountAmount,
            decimal totalAmount)
        {
            OrderId = orderId;
            OrderNumber = orderNumber;
            UserId = userId;
            CouponCode = couponCode;
            DiscountAmount = discountAmount;
            TotalAmount = totalAmount;
        }

        public Guid OrderId { get; set; }

        public string OrderNumber { get; set; } = default!;

        public string? UserId { get; set; }

        public string? CouponCode { get; set; }

        public decimal DiscountAmount { get; set; }

        public decimal TotalAmount { get; set; }
    }
}
