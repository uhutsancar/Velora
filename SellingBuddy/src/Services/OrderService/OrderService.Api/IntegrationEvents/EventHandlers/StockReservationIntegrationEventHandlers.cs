using EventBus.Base.Abstraction;
using OrderService.Api.IntegrationEvents.Events;
using OrderService.Application.IntegrationEvents;
using OrderService.Application.Interfaces.Repositories;
using OrderService.Domain.AggregateModels.OrderAggregate;

namespace OrderService.Api.IntegrationEvents.EventHandlers;

public sealed class StockReservationConfirmedIntegrationEventHandler
    : IIntegrationEventHandler<StockReservationConfirmedIntegrationEvent>
{
    private readonly IOrderRepository orders;
    private readonly IIntegrationEventOutbox outbox;

    public StockReservationConfirmedIntegrationEventHandler(IOrderRepository orders, IIntegrationEventOutbox outbox)
    {
        this.orders = orders;
        this.outbox = outbox;
    }

    public async Task Handle(StockReservationConfirmedIntegrationEvent @event)
    {
        var order = await orders.GetWithItemsAsync(@event.OrderId);
        if (order is null || order.OrderStatusId is 3 or 4 or 5 or 6)
            return;

        order.SetStockConfirmedStatus();
        outbox.Enqueue(new OrderStartedIntegrationEvent(
            order.Id,
            order.OrderNumber,
            order.UserId,
            order.UserName,
            order.TotalAmount,
            order.Currency,
            order.PaymentProvider,
            order.PaymentMethodToken));
        orders.Update(order);
        await orders.UnitOfWork.SaveEntitiesAsync();
    }
}

public sealed class StockReservationRejectedIntegrationEventHandler
    : IIntegrationEventHandler<StockReservationRejectedIntegrationEvent>
{
    private readonly IOrderRepository orders;

    public StockReservationRejectedIntegrationEventHandler(IOrderRepository orders) => this.orders = orders;

    public async Task Handle(StockReservationRejectedIntegrationEvent @event)
    {
        var order = await orders.GetWithItemsAsync(@event.OrderId);
        if (order is null || order.OrderStatusId == OrderStatus.Cancelled.Id)
            return;

        // A late rejection cannot undo money movement. It requires reconciliation.
        if (order.OrderStatusId is 4 or 5)
            throw new InvalidOperationException($"Late stock rejection for paid order {order.Id}.");

        order.SetCancelledStatus($"Stock reservation rejected: {@event.Reason}");
        orders.Update(order);
        await orders.UnitOfWork.SaveEntitiesAsync();
    }
}
