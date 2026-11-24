using CatalogService.Api.Core.Domain;
using CatalogService.Api.Infrastructure.Context;
using CatalogService.Api.IntegrationEvents.Events;
using EventBus.Base.Abstraction;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace CatalogService.Api.IntegrationEvents.EventHandlers;

/// <summary>Releases a reservation exactly once when payment is declined.</summary>
public sealed class OrderPaymentFailedIntegrationEventHandler : IIntegrationEventHandler<OrderPaymentFailedIntegrationEvent>
{
    private readonly CatalogContext db;

    public OrderPaymentFailedIntegrationEventHandler(CatalogContext db) => this.db = db;

    public async Task Handle(OrderPaymentFailedIntegrationEvent @event)
    {
        var executionStrategy = db.Database.CreateExecutionStrategy();
        await executionStrategy.ExecuteAsync(async () =>
        {
        db.ChangeTracker.Clear();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var reservations = await db.StockReservations
            .Where(item => item.OrderId == @event.OrderId && item.Status == StockReservationStatus.Reserved)
            .ToListAsync();

        var couponReservation = await db.CouponRedemptions
            .SingleOrDefaultAsync(item => item.OrderId == @event.OrderId && item.Status == StockReservationStatus.Reserved);

        if (reservations.Count == 0 && couponReservation is null)
        {
            await transaction.RollbackAsync();
            return;
        }

        var productIds = reservations.Select(item => item.ProductId).Distinct().ToList();
        var products = await db.CatalogItems
            .Include(product => product.Variants)
            .Where(product => productIds.Contains(product.Id))
            .ToDictionaryAsync(product => product.Id);
        var oldStocks = products.ToDictionary(item => item.Key, item => item.Value.TotalStock);

        foreach (var reservation in reservations)
        {
            var product = products[reservation.ProductId];
            if (reservation.VariantId is { } variantId)
                product.Variants.Single(variant => variant.Id == variantId).Stock += reservation.Quantity;
            else
                product.AvailableStock += reservation.Quantity;

            reservation.Status = StockReservationStatus.Released;
            reservation.SettledAtUtc = DateTime.UtcNow;
            product.OnReorder = product.TotalStock <= product.RestockThreshold;
            product.UpdatedAtUtc = DateTime.UtcNow;
        }

        foreach (var product in products.Values)
            db.Enqueue(new ProductStockChangedIntegrationEvent(
                product.Id,
                product.TotalStock,
                oldStocks[product.Id]));

        if (couponReservation is not null)
        {
            var coupon = await db.Coupons.SingleAsync(item => item.Code == couponReservation.CouponCode);
            coupon.UsedCount = Math.Max(0, coupon.UsedCount - 1);
            couponReservation.Status = StockReservationStatus.Released;
            couponReservation.SettledAtUtc = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        });
    }
}
