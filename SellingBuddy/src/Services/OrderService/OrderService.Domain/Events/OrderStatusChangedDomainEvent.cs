using MediatR;

namespace OrderService.Domain.Events
{
    /// <summary>
    /// Raised whenever an order moves to a new status. The application layer turns this
    /// into an integration event so notifications and analytics can react.
    /// </summary>
    public class OrderStatusChangedDomainEvent : INotification
    {
        public OrderStatusChangedDomainEvent(Guid orderId, int statusId, string statusName, string? userId, string? userName)
        {
            OrderId = orderId;
            StatusId = statusId;
            StatusName = statusName;
            UserId = userId;
            UserName = userName;
        }

        public Guid OrderId { get; }

        public int StatusId { get; }

        public string StatusName { get; }

        public string? UserId { get; }

        public string? UserName { get; }
    }
}
