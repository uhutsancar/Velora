using EventBus.Base.Abstraction;
using OrderService.Api.IntegrationEvents.Events;
using OrderService.Application.Interfaces.Repositories;

namespace OrderService.Api.IntegrationEvents.EventHandlers
{
    /// <summary>
    /// Moves the order to Paid once PaymentService confirms the charge.
    /// Without this handler the saga would never complete and orders would sit in Submitted.
    /// </summary>
    public class OrderPaymentSuccessIntegrationEventHandler : IIntegrationEventHandler<OrderPaymentSuccessIntegrationEvent>
    {
        private readonly IOrderRepository orderRepository;
        private readonly ILogger<OrderPaymentSuccessIntegrationEventHandler> logger;

        public OrderPaymentSuccessIntegrationEventHandler(
            IOrderRepository orderRepository,
            ILogger<OrderPaymentSuccessIntegrationEventHandler> logger)
        {
            this.orderRepository = orderRepository;
            this.logger = logger;
        }

        public async Task Handle(OrderPaymentSuccessIntegrationEvent @event)
        {
            var order = await orderRepository.GetWithItemsAsync(@event.OrderId);

            if (order is null)
            {
                logger.LogWarning("Payment success received for unknown order {OrderId}.", @event.OrderId);
                return;
            }

            order.SetPaidStatus();

            orderRepository.Update(order);
            await orderRepository.UnitOfWork.SaveEntitiesAsync();

            logger.LogInformation("Order {OrderNumber} marked as paid.", order.OrderNumber);
        }
    }

    /// <summary>Cancels the order when the charge is declined.</summary>
    public class OrderPaymentFailedIntegrationEventHandler : IIntegrationEventHandler<OrderPaymentFailedIntegrationEvent>
    {
        private readonly IOrderRepository orderRepository;
        private readonly ILogger<OrderPaymentFailedIntegrationEventHandler> logger;

        public OrderPaymentFailedIntegrationEventHandler(
            IOrderRepository orderRepository,
            ILogger<OrderPaymentFailedIntegrationEventHandler> logger)
        {
            this.orderRepository = orderRepository;
            this.logger = logger;
        }

        public async Task Handle(OrderPaymentFailedIntegrationEvent @event)
        {
            var order = await orderRepository.GetWithItemsAsync(@event.OrderId);

            if (order is null)
            {
                logger.LogWarning("Payment failure received for unknown order {OrderId}.", @event.OrderId);
                return;
            }

            order.SetCancelledStatus($"Ödeme alınamadı: {@event.ErrorMessage}");

            orderRepository.Update(order);
            await orderRepository.UnitOfWork.SaveEntitiesAsync();

            logger.LogWarning("Order {OrderNumber} cancelled after a failed payment: {Reason}",
                order.OrderNumber, @event.ErrorMessage);
        }
    }
}
