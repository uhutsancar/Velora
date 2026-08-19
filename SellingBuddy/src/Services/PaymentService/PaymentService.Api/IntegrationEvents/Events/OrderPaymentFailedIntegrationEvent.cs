using EventBus.Base.Events;

namespace PaymentService.Api.IntegrationEvents.Events
{
    /// <summary>Published when the charge for an order is declined.</summary>
    public class OrderPaymentFailedIntegrationEvent : IntegrationEvent
    {
        public OrderPaymentFailedIntegrationEvent()
        {
        }

        public OrderPaymentFailedIntegrationEvent(Guid orderId, string errorMessage, string? orderNumber = null)
        {
            OrderId = orderId;
            ErrorMessage = errorMessage;
            OrderNumber = orderNumber;
        }

        public Guid OrderId { get; set; }

        public string? OrderNumber { get; set; }

        public string ErrorMessage { get; set; } = default!;
    }
}
