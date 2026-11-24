using MediatR;
using Microsoft.Extensions.Logging;
using OrderService.Application.Interfaces.Repositories;
using OrderService.Domain.AggregateModels.OrderAggregate;

namespace OrderService.Application.Features.Commands.CreateOrder
{
    public class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, bool>
    {
        private readonly IOrderRepository orderRepository;
        private readonly ILogger<CreateOrderCommandHandler> logger;

        public CreateOrderCommandHandler(
            IOrderRepository orderRepository,
            ILogger<CreateOrderCommandHandler> logger)
        {
            this.orderRepository = orderRepository;
            this.logger = logger;
        }

        public async Task<bool> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
        {
            if (await orderRepository.GetWithItemsAsync(request.OrderId) is not null)
            {
                logger.LogInformation("Duplicate checkout for existing order {OrderId} ignored.", request.OrderId);
                return true;
            }

            var address = new Address(request.Street, request.City, request.State, request.Country, request.ZipCode);

            var order = new Order(
                request.OrderId,
                request.UserName,
                address,
                request.PaymentProvider,
                request.PaymentMethodToken,
                request.Currency,
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
            order.SetAwaitingValidationStatus();

            await orderRepository.AddAsync(order);

            await orderRepository.UnitOfWork.SaveEntitiesAsync(cancellationToken);

            logger.LogInformation("Order {OrderNumber} ({OrderId}) created for {UserId}, total {Total}.",
                order.OrderNumber, order.Id, request.UserId, order.TotalAmount);

            return true;
        }
    }
}
