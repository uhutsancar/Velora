using EventBus.Base.Abstraction;
using MediatR;
using OrderService.Api.IntegrationEvents.Events;
using OrderService.Application.Features.Commands.CreateOrder;

namespace OrderService.Api.IntegrationEvents.EventHandlers
{
    /// <summary>Turns an accepted checkout into an order aggregate.</summary>
    public class OrderCreatedIntegrationEventHandler : IIntegrationEventHandler<OrderCreatedIntegrationEvent>
    {
        private readonly IMediator mediator;
        private readonly ILogger<OrderCreatedIntegrationEventHandler> logger;

        public OrderCreatedIntegrationEventHandler(IMediator mediator, ILogger<OrderCreatedIntegrationEventHandler> logger)
        {
            this.mediator = mediator;
            this.logger = logger;
        }

        public async Task Handle(OrderCreatedIntegrationEvent @event)
        {
            logger.LogInformation("Handling OrderCreated {IntegrationEventId} for user {UserId}.", @event.Id, @event.UserId);

            if (@event.Basket?.Items is not { Count: > 0 })
            {
                logger.LogWarning("OrderCreated {IntegrationEventId} carried an empty basket, nothing to do.", @event.Id);
                return;
            }

            var command = new CreateOrderCommand(
                @event.Basket.Items,
                @event.UserId,
                @event.UserName,
                @event.City,
                @event.Street,
                @event.State,
                @event.Country,
                @event.ZipCode,
                @event.CardNumber,
                @event.CardHolderName,
                @event.CardExpiration,
                @event.CardSecurityNumber,
                @event.CardTypeId,
                @event.Basket.CouponCode,
                @event.Basket.DiscountAmount);

            await mediator.Send(command);
        }
    }
}
