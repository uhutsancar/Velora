using EventBus.Base.Abstraction;
using MediatR;
using Microsoft.Extensions.Logging;
using OrderService.Application.IntegrationEvents;
using OrderService.Application.Interfaces.Repositories;
using OrderService.Domain.AggregateModels.OrderAggregate;

namespace OrderService.Application.Features.Commands.CreateOrder
{
    public class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, bool>
    {
        private readonly IOrderRepository orderRepository;
        private readonly IEventBus eventBus;
        private readonly ILogger<CreateOrderCommandHandler> logger;

        public CreateOrderCommandHandler(
            IOrderRepository orderRepository,
            IEventBus eventBus,
            ILogger<CreateOrderCommandHandler> logger)
        {
            this.orderRepository = orderRepository;
            this.eventBus = eventBus;
            this.logger = logger;
        }

        public async Task<bool> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
        {
            var address = new Address(request.Street, request.City, request.State, request.Country, request.ZipCode);

            var order = new Order(
                request.UserName,
                address,
                request.CardTypeId,
                request.CardNumber,
                request.CardSecurityNumber,
                request.CardHolderName,
                request.CardExpiration,
                paymentMethodId: null,
                buyerId: null,
                userId: request.UserId);

            foreach (var item in request.OrderItems)
            {
                order.AddOrderItem(
                    item.ProductId,
                    item.ProductName,
                    item.UnitPrice,
                    item.PictureUrl ?? string.Empty,
                    item.Units,
                    item.VariantId,
                    item.VariantLabel);
            }

            order.ApplyDiscount(request.CouponCode, request.DiscountAmount);

            await orderRepository.AddAsync(order);

            // Commits the aggregate and dispatches OrderStartedDomainEvent, which
            // creates or verifies the buyer's payment method in the same transaction.
            await orderRepository.UnitOfWork.SaveEntitiesAsync(cancellationToken);

            logger.LogInformation("Order {OrderNumber} ({OrderId}) created for {UserId}, total {Total}.",
                order.OrderNumber, order.Id, request.UserId, order.TotalAmount);

            // PaymentService listens for this to run the payment step of the saga.
            eventBus.Publish(new OrderStartedIntegrationEvent(order.Id, order.OrderNumber, request.UserId, request.UserName, order.TotalAmount));

            return true;
        }
    }
}
