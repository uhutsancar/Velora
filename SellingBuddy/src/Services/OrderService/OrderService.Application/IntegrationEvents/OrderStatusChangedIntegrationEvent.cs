using EventBus.Base.Events;

namespace OrderService.Application.IntegrationEvents
{
    /// <summary>Broadcast whenever an order reaches a new status.</summary>
    public class OrderStatusChangedIntegrationEvent : IntegrationEvent
    {
        public OrderStatusChangedIntegrationEvent()
        {
        }

        public OrderStatusChangedIntegrationEvent(Guid orderId, int statusId, string statusName, string? userId, string? userName)
        {
            OrderId = orderId;
            StatusId = statusId;
            StatusName = statusName;
            UserId = userId;
            UserName = userName;
        }

        public Guid OrderId { get; set; }

        public int StatusId { get; set; }

        public string StatusName { get; set; } = default!;

        public string? UserId { get; set; }

        public string? UserName { get; set; }
    }
}
