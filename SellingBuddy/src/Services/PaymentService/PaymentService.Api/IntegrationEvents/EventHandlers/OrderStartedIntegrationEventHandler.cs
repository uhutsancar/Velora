using EventBus.Base.Abstraction;
using EventBus.Base.Events;
using PaymentService.Api.IntegrationEvents.Events;

namespace PaymentService.Api.IntegrationEvents.EventHandlers
{
    /// <summary>
    /// Development-only deterministic sandbox boundary. Production deliberately fails
    /// closed until a tokenized PSP adapter and signed webhook are configured.
    /// </summary>
    public class OrderStartedIntegrationEventHandler : IIntegrationEventHandler<OrderStartedIntegrationEvent>
    {
        private readonly IHostEnvironment environment;
        private readonly IConfiguration configuration;
        private readonly IEventBus eventBus;
        private readonly ILogger<OrderStartedIntegrationEventHandler> logger;

        public OrderStartedIntegrationEventHandler(
            IHostEnvironment environment,
            IConfiguration configuration,
            IEventBus eventBus,
            ILogger<OrderStartedIntegrationEventHandler> logger)
        {
            this.environment = environment;
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

            // No PAN/CVV enters this service. A production adapter exchanges this opaque
            // token and uses OrderId as the PSP idempotency key.
            var mode = configuration["Payment:Mode"] ?? "Disabled";
            var sandboxEnabled = string.Equals(mode, "Sandbox", StringComparison.OrdinalIgnoreCase)
                && (environment.IsDevelopment() || configuration.GetValue<bool>("Payment:AllowSandbox"));

            var paymentSucceeded = sandboxEnabled
                && string.Equals(@event.PaymentProvider, "sandbox", StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrWhiteSpace(@event.PaymentMethodToken)
                && @event.PaymentMethodToken.StartsWith("sandbox_approved", StringComparison.Ordinal);

            var failureReason = sandboxEnabled
                ? "Sandbox payment token was declined."
                : "No production payment provider is configured.";

            IntegrationEvent result = paymentSucceeded
                ? new OrderPaymentSuccessIntegrationEvent(@event.OrderId, @event.OrderNumber, @event.TotalAmount)
                : new OrderPaymentFailedIntegrationEvent(@event.OrderId, failureReason, @event.OrderNumber);

            logger.LogInformation(
                "Payment for order {OrderNumber} ({OrderId}) processed. Success: {Success}",
                @event.OrderNumber,
                @event.OrderId,
                paymentSucceeded);

            eventBus.Publish(result);
            return Task.CompletedTask;
        }
    }
}
