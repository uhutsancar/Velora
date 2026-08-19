using BasketService.Api.Core.Domain.Models;
using EventBus.Base.Events;

namespace BasketService.Api.IntegrationEvents.Events
{
    /// <summary>
    /// Published when a customer confirms checkout. Consumed by OrderService (creates the
    /// order), CatalogService (reserves stock) and BasketService itself (clears the basket).
    /// </summary>
    public class OrderCreatedIntegrationEvent : IntegrationEvent
    {
        /// <summary>Required by the JSON deserialiser on the subscriber side.</summary>
        public OrderCreatedIntegrationEvent()
        {
        }

        public OrderCreatedIntegrationEvent(string userId, string userName, string city, string street,
            string state, string country, string zipCode, string cardNumber, string cardHolderName,
            DateTime cardExpiration, string cardSecurityNumber, int cardTypeId, string buyer,
            CustomerBasket basket)
        {
            UserId = userId;
            UserName = userName;
            City = city;
            Street = street;
            State = state;
            Country = country;
            ZipCode = zipCode;
            CardNumber = cardNumber;
            CardHolderName = cardHolderName;
            CardExpiration = cardExpiration;
            CardSecurityNumber = cardSecurityNumber;
            CardTypeId = cardTypeId;
            Buyer = buyer;
            Basket = basket;
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

        public CustomerBasket Basket { get; set; } = new();
    }
}
