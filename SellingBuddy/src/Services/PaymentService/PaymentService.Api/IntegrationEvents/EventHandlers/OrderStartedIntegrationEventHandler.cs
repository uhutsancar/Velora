using EventBus.Base.Abstraction;
using EventBus.Base.Events;
using PaymentService.Api.IntegrationEvents.Events;

namespace PaymentService.Api.IntegrationEvents.EventHandlers
{
    /// <summary>
    /// Simulated payment step of the checkout saga. A real provider integration would
    /// replace the body of <see cref="Handle"/>; the contract stays the same.
    /// </summary>
    public class OrderStartedIntegrationEventHandler : IIntegrationEventHandler<OrderStartedIntegrationEvent>
    {
        private readonly IConfiguration configuration;
        private readonly IEventBus eventBus;
        private readonly ILogger<OrderStartedIntegrationEventHandler> logger;

        public OrderStartedIntegrationEventHandler(
            IConfiguration configuration,
            IEventBus eventBus,
            ILogger<OrderStartedIntegrationEventHandler> logger)
        {
            this.configuration = configuration;
            this.eventBus = eventBus;
            this.logger = logger;
        }

        public Task Handle(OrderStartedIntegrationEvent @event)
        {
            if (@event.OrderId == Guid.Empty)
            {
                logger.LogWarning("OrderStarted event {EventId} arrived without an order id, skipping.", @event.Id);
                return Task.CompletedTask;
            }

            // "PaymentSuccess" in configuration decides the outcome of the fake gateway.
            var paymentSucceeded = configuration.GetValue("PaymentSuccess", true);

            IntegrationEvent result = paymentSucceeded
                ? new OrderPaymentSuccessIntegrationEvent(@event.OrderId, @event.OrderNumber, @event.TotalAmount)
                : new OrderPaymentFailedIntegrationEvent(@event.OrderId, "Kart provizyonu alınamadı.", @event.OrderNumber);

            logger.LogInformation("Payment for order {OrderNumber} ({OrderId}) processed. Success: {Success}",
                @event.OrderNumber, @event.OrderId, paymentSucceeded);

            eventBus.Publish(result);

            return Task.CompletedTask;
        }
    }
}
