using CatalogService.Api.Core.Domain;
using CatalogService.Api.Infrastructure.Context;
using CatalogService.Api.IntegrationEvents.Events;
using EventBus.Base.Abstraction;
using Microsoft.EntityFrameworkCore;

namespace CatalogService.Api.IntegrationEvents.EventHandlers;

/// <summary>Consumes stock and coupon reservations idempotently after payment.</summary>
public sealed class OrderPaidIntegrationEventHandler : IIntegrationEventHandler<OrderPaidIntegrationEvent>
{
    private readonly CatalogContext db;
    private readonly ILogger<OrderPaidIntegrationEventHandler> logger;

    public OrderPaidIntegrationEventHandler(CatalogContext db, ILogger<OrderPaidIntegrationEventHandler> logger)
    {
        this.db = db;
        this.logger = logger;
    }

    public async Task Handle(OrderPaidIntegrationEvent @event)
    {
        var executionStrategy = db.Database.CreateExecutionStrategy();
        await executionStrategy.ExecuteAsync(async () =>
        {
        db.ChangeTracker.Clear();
        await using var transaction = await db.Database.BeginTransactionAsync();

        var stockRows = await db.StockReservations
            .Where(item => item.OrderId == @event.OrderId && item.Status == StockReservationStatus.Reserved)
            .ExecuteUpdateAsync(update => update
                .SetProperty(item => item.Status, StockReservationStatus.Consumed)
                .SetProperty(item => item.SettledAtUtc, DateTime.UtcNow));

        var couponRows = await db.CouponRedemptions
            .Where(item => item.OrderId == @event.OrderId && item.Status == StockReservationStatus.Reserved)
            .ExecuteUpdateAsync(update => update
                .SetProperty(item => item.Status, StockReservationStatus.Consumed)
                .SetProperty(item => item.SettledAtUtc, DateTime.UtcNow));

        await transaction.CommitAsync();

        logger.LogInformation(
            "Settled order {OrderNumber}: {StockRows} stock rows, {CouponRows} coupon rows.",
            @event.OrderNumber, stockRows, couponRows);
        });
    }
}
