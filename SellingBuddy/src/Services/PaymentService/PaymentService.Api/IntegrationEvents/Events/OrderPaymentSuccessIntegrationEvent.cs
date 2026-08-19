using EventBus.Base.Events;

namespace PaymentService.Api.IntegrationEvents.Events
{
    /// <summary>Published when the charge for an order succeeds.</summary>
    public class OrderPaymentSuccessIntegrationEvent : IntegrationEvent
    {
        public OrderPaymentSuccessIntegrationEvent()
        {
        }

        public OrderPaymentSuccessIntegrationEvent(Guid orderId, string? orderNumber = null, decimal totalAmount = 0)
        {
            OrderId = orderId;
            OrderNumber = orderNumber;
            TotalAmount = totalAmount;
        }

        public Guid OrderId { get; set; }

        public string? OrderNumber { get; set; }

        public decimal TotalAmount { get; set; }
    }
}
