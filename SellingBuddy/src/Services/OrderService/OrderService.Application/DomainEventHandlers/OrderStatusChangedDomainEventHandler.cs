using MediatR;
using Microsoft.Extensions.Logging;
using OrderService.Application.IntegrationEvents;
using OrderService.Domain.Events;
using OrderService.Application.Interfaces.Repositories;

namespace OrderService.Application.DomainEventHandlers
{
    /// <summary>
    /// Turns an internal status change into an integration event so NotificationService
    /// (and anything else that subscribes later) can react without coupling to this service.
    /// </summary>
    public class OrderStatusChangedDomainEventHandler : INotificationHandler<OrderStatusChangedDomainEvent>
    {
        private readonly IIntegrationEventOutbox outbox;
        private readonly ILogger<OrderStatusChangedDomainEventHandler> logger;

        public OrderStatusChangedDomainEventHandler(IIntegrationEventOutbox outbox, ILogger<OrderStatusChangedDomainEventHandler> logger)
        {
            this.outbox = outbox;
            this.logger = logger;
        }

        public Task Handle(OrderStatusChangedDomainEvent notification, CancellationToken cancellationToken)
        {
            logger.LogInformation("Order {OrderId} moved to {Status}.", notification.OrderId, notification.StatusName);

            outbox.Enqueue(new OrderStatusChangedIntegrationEvent(
                notification.OrderId,
                notification.StatusId,
                notification.StatusName,
                notification.UserId,
                notification.UserName));

            return Task.CompletedTask;
        }
    }
}
