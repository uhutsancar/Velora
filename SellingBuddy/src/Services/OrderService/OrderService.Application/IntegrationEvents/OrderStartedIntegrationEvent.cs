using EventBus.Base.Events;

namespace OrderService.Application.IntegrationEvents
{
    /// <summary>
    /// Published once the order aggregate has been persisted. PaymentService consumes it
    /// and answers with OrderPaymentSuccess / OrderPaymentFailed.
    /// The OrderId is what closes the saga loop, so it is part of the contract.
    /// </summary>
    public class OrderStartedIntegrationEvent : IntegrationEvent
    {
        public OrderStartedIntegrationEvent()
        {
        }

        public OrderStartedIntegrationEvent(Guid orderId, string orderNumber, string? userId, string? userName,
            decimal totalAmount, string currency, string paymentProvider, string paymentMethodToken)
        {
            OrderId = orderId;
            OrderNumber = orderNumber;
            UserId = userId;
            UserName = userName;
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
