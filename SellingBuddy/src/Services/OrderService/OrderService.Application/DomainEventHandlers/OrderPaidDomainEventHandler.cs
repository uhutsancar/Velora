using MediatR;
using Microsoft.Extensions.Logging;
using OrderService.Application.IntegrationEvents;
using OrderService.Domain.Events;
using OrderService.Application.Interfaces.Repositories;

namespace OrderService.Application.DomainEventHandlers
{
    /// <summary>
    /// Publishes the payment fact to the rest of the platform. CatalogService uses it to
    /// increment the coupon's redemption count, which is the point at which a usage limit
    /// becomes real rather than advisory.
    /// </summary>
    public class OrderPaidDomainEventHandler : INotificationHandler<OrderPaidDomainEvent>
    {
        private readonly IIntegrationEventOutbox outbox;
        private readonly ILogger<OrderPaidDomainEventHandler> logger;

        public OrderPaidDomainEventHandler(IIntegrationEventOutbox outbox, ILogger<OrderPaidDomainEventHandler> logger)
        {
            this.outbox = outbox;
            this.logger = logger;
        }

        public Task Handle(OrderPaidDomainEvent notification, CancellationToken cancellationToken)
        {
            logger.LogInformation(
                "Order {OrderNumber} paid ({Total}); publishing OrderPaid{Coupon}.",
                notification.OrderNumber,
                notification.TotalAmount,
                notification.CouponCode is null ? string.Empty : $" with coupon {notification.CouponCode}");

            outbox.Enqueue(new OrderPaidIntegrationEvent(
                notification.OrderId,
                notification.OrderNumber,
                notification.UserId,
                notification.CouponCode,
                notification.DiscountAmount,
                notification.TotalAmount));

            return Task.CompletedTask;
        }
    }
}
