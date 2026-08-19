using EventBus.Base.Events;
using OrderService.Domain.Models;

namespace OrderService.Api.IntegrationEvents.Events
{
    /// <summary>
    /// Mirror of the checkout event published by BasketService. Property names must match
    /// exactly: the bus routes on the event name and binds by shape.
    /// </summary>
    public class OrderCreatedIntegrationEvent : IntegrationEvent
    {
        public OrderCreatedIntegrationEvent()
        {
        }

        public string UserId { get; set; } = default!;

        public string UserName { get; set; } = default!;

        public int OrderNumber { get; set; }

        public string City { get; set; } = default!;

        public string Street { get; set; } = default!;

        public string State { get; set; } = default!;

        public string Country { get; set; } = default!;

        public string ZipCode { get; set; } = default!;

        public string CardNumber { get; set; } = default!;

        public string CardHolderName { get; set; } = default!;

        public DateTime CardExpiration { get; set; }

        public string CardSecurityNumber { get; set; } = default!;

        public int CardTypeId { get; set; }

        public string Buyer { get; set; } = default!;

        public Guid RequestId { get; set; }

        public CustomerBasket Basket { get; set; } = new();
    }
}
