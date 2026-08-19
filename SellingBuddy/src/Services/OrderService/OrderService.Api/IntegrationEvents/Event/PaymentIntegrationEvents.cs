using EventBus.Base.Events;

namespace OrderService.Api.IntegrationEvents.Events
{
    /// <summary>
    /// Mirror of the event PaymentService publishes when the charge succeeds.
    /// Consuming it is what closes the checkout saga.
    /// </summary>
    public class OrderPaymentSuccessIntegrationEvent : IntegrationEvent
    {
        public OrderPaymentSuccessIntegrationEvent()
        {
        }

        public OrderPaymentSuccessIntegrationEvent(Guid orderId)
        {
            OrderId = orderId;
        }

        public Guid OrderId { get; set; }
    }

    /// <summary>Mirror of the event PaymentService publishes when the charge fails.</summary>
    public class OrderPaymentFailedIntegrationEvent : IntegrationEvent
    {
        public OrderPaymentFailedIntegrationEvent()
        {
        }

        public OrderPaymentFailedIntegrationEvent(Guid orderId, string errorMessage)
        {
            OrderId = orderId;
            ErrorMessage = errorMessage;
        }

        public Guid OrderId { get; set; }

        public string ErrorMessage { get; set; } = default!;
    }
}
