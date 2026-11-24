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

        public OrderStartedIntegrationEvent(Guid orderId, string orderNumber, decimal totalAmount,
            string currency, string paymentProvider, string paymentMethodToken)
        {
            OrderId = orderId;
            OrderNumber = orderNumber;
            TotalAmount = totalAmount;
            Currency = currency;
            PaymentProvider = paymentProvider;
            PaymentMethodToken = paymentMethodToken;
        }

        public Guid OrderId { get; set; }

        public string OrderNumber { get; set; } = default!;

        public string? UserId { get; set; }

        public string? UserName { get; set; }

        public decimal TotalAmount { get; set; }

        public string Currency { get; set; } = "TRY";

        public string PaymentProvider { get; set; } = default!;

        public string PaymentMethodToken { get; set; } = default!;
    }
}
