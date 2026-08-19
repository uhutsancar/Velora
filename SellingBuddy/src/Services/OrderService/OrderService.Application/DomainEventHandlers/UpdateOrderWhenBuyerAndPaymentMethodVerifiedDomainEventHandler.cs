using MediatR;
using Microsoft.Extensions.Logging;
using OrderService.Application.Interfaces.Repositories;
using OrderService.Domain.Events;

namespace OrderService.Application.DomainEventHandlers
{
    /// <summary>
    /// Links the freshly verified buyer and payment method back onto the order.
    /// Runs inside the same unit of work, so the change is committed by the caller.
    /// </summary>
    public class UpdateOrderWhenBuyerAndPaymentMethodVerifiedDomainEventHandler
        : INotificationHandler<BuyerAndPaymentMethodVerifiedDomainEvent>
    {
        private readonly IOrderRepository orderRepository;
        private readonly ILogger<UpdateOrderWhenBuyerAndPaymentMethodVerifiedDomainEventHandler> logger;

        public UpdateOrderWhenBuyerAndPaymentMethodVerifiedDomainEventHandler(
            IOrderRepository orderRepository,
            ILogger<UpdateOrderWhenBuyerAndPaymentMethodVerifiedDomainEventHandler> logger)
        {
            this.orderRepository = orderRepository ?? throw new ArgumentNullException(nameof(orderRepository));
            this.logger = logger;
        }

        public async Task Handle(BuyerAndPaymentMethodVerifiedDomainEvent notification, CancellationToken cancellationToken)
        {
            var order = await orderRepository.GetByIdAsync(notification.OrderId);

            if (order is null)
            {
                logger.LogWarning("Order {OrderId} not found while linking the verified payment method.", notification.OrderId);
                return;
            }

            order.SetBuyerId(notification.Buyer.Id);
            order.SetPaymentMethodId(notification.Payment.Id);

            logger.LogInformation("Order {OrderId} linked to buyer {BuyerId}.", order.Id, notification.Buyer.Id);
        }
    }
}
