using EventBus.Base.Abstraction;
using MediatR;
using Microsoft.Extensions.Logging;
using OrderService.Application.IntegrationEvents;
using OrderService.Domain.Events;

namespace OrderService.Application.DomainEventHandlers
{
    /// <summary>
    /// Turns an internal status change into an integration event so NotificationService
    /// (and anything else that subscribes later) can react without coupling to this service.
    /// </summary>
    public class OrderStatusChangedDomainEventHandler : INotificationHandler<OrderStatusChangedDomainEvent>
    {
        private readonly IEventBus eventBus;
        private readonly ILogger<OrderStatusChangedDomainEventHandler> logger;

        public OrderStatusChangedDomainEventHandler(IEventBus eventBus, ILogger<OrderStatusChangedDomainEventHandler> logger)
        {
            this.eventBus = eventBus;
            this.logger = logger;
        }

        public Task Handle(OrderStatusChangedDomainEvent notification, CancellationToken cancellationToken)
        {
            logger.LogInformation("Order {OrderId} moved to {Status}.", notification.OrderId, notification.StatusName);

            eventBus.Publish(new OrderStatusChangedIntegrationEvent(
                notification.OrderId,
                notification.StatusId,
                notification.StatusName,
                notification.UserId,
                notification.UserName));

            return Task.CompletedTask;
        }
    }
}
