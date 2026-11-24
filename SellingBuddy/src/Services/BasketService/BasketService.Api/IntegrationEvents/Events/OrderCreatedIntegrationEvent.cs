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

        public OrderCreatedIntegrationEvent(Guid checkoutId, string userId, string userName, string city, string street,
            string state, string country, string zipCode, string paymentProvider, string paymentMethodToken,
            CustomerBasket basket)
        {
            CheckoutId = checkoutId;
            UserId = userId;
            UserName = userName;
            City = city;
            Street = street;
            State = state;
            Country = country;
            ZipCode = zipCode;
            PaymentProvider = paymentProvider;
            PaymentMethodToken = paymentMethodToken;
            Basket = basket;
        }

        public string UserId { get; set; } = default!;

        public Guid CheckoutId { get; set; }

        public string UserName { get; set; } = default!;

        public int OrderNumber { get; set; }

        public string City { get; set; } = default!;

        public string Street { get; set; } = default!;

        public string State { get; set; } = default!;

        public string Country { get; set; } = default!;

        public string ZipCode { get; set; } = default!;

        public string PaymentProvider { get; set; } = default!;

        public string PaymentMethodToken { get; set; } = default!;

        public CustomerBasket Basket { get; set; } = new();
    }
}
