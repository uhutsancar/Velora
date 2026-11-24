using EventBus.Base.Events;

namespace OrderService.Api.IntegrationEvents.Events;

public sealed class StockReservationConfirmedIntegrationEvent : IntegrationEvent
{
    public Guid OrderId { get; set; }
}

public sealed class StockReservationRejectedIntegrationEvent : IntegrationEvent
{
    public Guid OrderId { get; set; }
    public string Reason { get; set; } = default!;
}
