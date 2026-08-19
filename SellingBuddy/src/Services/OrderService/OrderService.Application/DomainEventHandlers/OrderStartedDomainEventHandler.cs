using MediatR;
using Microsoft.Extensions.Logging;
using OrderService.Application.Interfaces.Repositories;
using OrderService.Domain.AggregateModels.BuyerAggregate;
using OrderService.Domain.Events;

namespace OrderService.Application.DomainEventHandlers
{
    /// <summary>
    /// Creates the buyer on first purchase and verifies (or stores) the payment method.
    /// </summary>
    public class OrderStartedDomainEventHandler : INotificationHandler<OrderStartedDomainEvent>
    {
        private readonly IBuyerRepository buyerRepository;
        private readonly ILogger<OrderStartedDomainEventHandler> logger;

        public OrderStartedDomainEventHandler(IBuyerRepository buyerRepository, ILogger<OrderStartedDomainEventHandler> logger)
        {
            this.buyerRepository = buyerRepository;
            this.logger = logger;
        }

        public async Task Handle(OrderStartedDomainEvent orderStartedEvent, CancellationToken cancellationToken)
        {
            var cardTypeId = orderStartedEvent.CardTypeId != 0 ? orderStartedEvent.CardTypeId : CardType.Visa.Id;

            var buyer = await buyerRepository.GetSingleAsync(
                b => b.Name == orderStartedEvent.UserName,
                b => b.PaymentMethods);

            var buyerExisted = buyer is not null;

            buyer ??= new Buyer(orderStartedEvent.UserName);

            buyer.VerifyOrAddPaymentMethod(
                cardTypeId,
                $"Payment method registered on {DateTime.UtcNow:yyyy-MM-dd}",
                orderStartedEvent.CardNumber,
                orderStartedEvent.CardSecurityNumber,
                orderStartedEvent.CardHolderName,
                orderStartedEvent.CardExpiration,
                orderStartedEvent.Order.Id);

            if (buyerExisted)
                buyerRepository.Update(buyer);
            else
                await buyerRepository.AddAsync(buyer);

            await buyerRepository.UnitOfWork.SaveEntitiesAsync(cancellationToken);

            logger.LogInformation("Buyer {BuyerName} verified for order {OrderId}.",
                orderStartedEvent.UserName, orderStartedEvent.Order.Id);
        }
    }
}
