using EventBus.Base.Events;

namespace PaymentService.Api.IntegrationEvents.Events
{
    /// <summary>
    /// Mirror of the event OrderService publishes once an order has been persisted.
    /// OrderId is a Guid because that is the order aggregate's key.
    /// </summary>
    public class OrderStartedIntegrationEvent : IntegrationEvent
    {
        public OrderStartedIntegrationEvent()
        {
        }

        public OrderStartedIntegrationEvent(Guid orderId, string orderNumber, decimal totalAmount)
        {
            OrderId = orderId;
            OrderNumber = orderNumber;
            TotalAmount = totalAmount;
        }

        public Guid OrderId { get; set; }

        public string OrderNumber { get; set; } = default!;

        public string? UserId { get; set; }

        public string? UserName { get; set; }

        public decimal TotalAmount { get; set; }
    }
}
