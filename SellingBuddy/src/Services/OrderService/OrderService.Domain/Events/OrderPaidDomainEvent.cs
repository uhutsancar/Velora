using MediatR;

namespace OrderService.Domain.Events
{
    /// <summary>
    /// Raised the moment an order is actually paid.
    ///
    /// Separate from <see cref="OrderStatusChangedDomainEvent"/> because payment is the
    /// point where downstream contexts must settle money-related state — redeeming the
    /// coupon, for example. A generic status change carries no payment payload.
    /// </summary>
    public class OrderPaidDomainEvent : INotification
    {
        public OrderPaidDomainEvent(
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

        public Guid OrderId { get; }

        public string OrderNumber { get; }

        public string? UserId { get; }

        /// <summary>Null when the order carried no coupon.</summary>
        public string? CouponCode { get; }

        public decimal DiscountAmount { get; }

        public decimal TotalAmount { get; }
    }
}
