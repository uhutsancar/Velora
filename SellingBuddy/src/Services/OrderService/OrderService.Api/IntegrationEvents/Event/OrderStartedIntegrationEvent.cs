using EventBus.Base.Events;

namespace OrderService.Api.IntegrationEvents.Event
{
    public class OrderStartedIntegrationEvent: IntegrationEvent
    {
        public OrderStartedIntegrationEvent(string userId, int orderId)
        {
            UserId = userId;
            OrderId = orderId;
        }

        public string UserId { get; private set; }

        public int OrderId { get; private set; }
    }
}
