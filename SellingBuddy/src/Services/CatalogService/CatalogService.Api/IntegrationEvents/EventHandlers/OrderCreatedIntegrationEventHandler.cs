using CatalogService.Api.Core.Domain;
using CatalogService.Api.Infrastructure.Context;
using CatalogService.Api.IntegrationEvents.Events;
using EventBus.Base.Abstraction;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace CatalogService.Api.IntegrationEvents.EventHandlers;

/// <summary>
/// Atomically reserves every line before OrderService is allowed to start payment.
/// The order id is the checkout id, making redelivery naturally idempotent.
/// </summary>
public sealed class OrderCreatedIntegrationEventHandler : IIntegrationEventHandler<OrderCreatedIntegrationEvent>
{
    private readonly CatalogContext db;
    private readonly ILogger<OrderCreatedIntegrationEventHandler> logger;

    public OrderCreatedIntegrationEventHandler(
        CatalogContext db,
        ILogger<OrderCreatedIntegrationEventHandler> logger)
    {
        this.db = db;
        this.logger = logger;
    }

    public async Task Handle(OrderCreatedIntegrationEvent @event)
    {
        var orderId = @event.CheckoutId == Guid.Empty ? @event.Id : @event.CheckoutId;
        if (@event.Basket?.Items is not { Count: > 0 } sourceLines)
        {
            db.Enqueue(new StockReservationRejectedIntegrationEvent(orderId, "The basket is empty."));
            await db.SaveChangesAsync();
            return;
        }

        // A committed reservation means a previous delivery completed its local effect
        // but may have lost the confirmation publish/ACK. Re-publish only the result.
        var priorReservations = await db.StockReservations.AsNoTracking()
            .Where(item => item.OrderId == orderId)
            .Select(item => item.Status)
            .ToListAsync();

        if (priorReservations.Count > 0)
        {
            var stillValid = priorReservations.All(status =>
                status == StockReservationStatus.Reserved || status == StockReservationStatus.Consumed);

            if (stillValid)
                db.Enqueue(new StockReservationConfirmedIntegrationEvent(orderId));
            else
                db.Enqueue(new StockReservationRejectedIntegrationEvent(orderId, "The stock reservation is no longer active."));

            await db.SaveChangesAsync();
            return;
        }

        var lines = sourceLines
            .GroupBy(line => new { line.ProductId, line.VariantId })
            .Select(group => new
            {
                group.Key.ProductId,
                group.Key.VariantId,
                Quantity = group.Sum(line => line.Quantity)
            })
            .ToList();

        var executionStrategy = db.Database.CreateExecutionStrategy();
        await executionStrategy.ExecuteAsync(async () =>
        {
        db.ChangeTracker.Clear();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var productIds = lines.Select(line => line.ProductId).Distinct().ToList();
        var products = await db.CatalogItems
            .Include(product => product.Variants)
            .Where(product => productIds.Contains(product.Id))
            .ToDictionaryAsync(product => product.Id);

        string? rejection = null;
        var stockChanges = new List<(int ProductId, int OldStock)>();

        foreach (var productGroup in lines.GroupBy(line => line.ProductId))
        {
            if (!products.TryGetValue(productGroup.Key, out var product) || !product.IsPublished)
            {
                rejection = $"Product {productGroup.Key} is unavailable.";
                break;
            }

            stockChanges.Add((product.Id, product.TotalStock));
            foreach (var line in productGroup)
            {
                if (line.Quantity <= 0)
                {
                    rejection = $"Product {line.ProductId} has an invalid quantity.";
                    break;
                }

                if (line.VariantId is { } variantId)
                {
                    var variant = product.Variants.SingleOrDefault(candidate => candidate.Id == variantId && candidate.IsActive);
                    if (variant is null || variant.Stock < line.Quantity)
                    {
                        rejection = $"Variant {variantId} does not have enough stock.";
                        break;
                    }

                    variant.Stock -= line.Quantity;
                }
                else
                {
                    if (product.Variants.Any(candidate => candidate.IsActive) || product.AvailableStock < line.Quantity)
                    {
                        rejection = $"Product {line.ProductId} does not have enough stock or requires a variant.";
                        break;
                    }

                    product.AvailableStock -= line.Quantity;
                }

                db.StockReservations.Add(new StockReservation
                {
                    OrderId = orderId,
                    SourceEventId = @event.Id,
                    ProductId = line.ProductId,
                    VariantId = line.VariantId,
                    Quantity = line.Quantity
                });
            }

            if (rejection is not null) break;

            product.OnReorder = product.TotalStock <= product.RestockThreshold;
            product.UpdatedAtUtc = DateTime.UtcNow;
        }

        if (rejection is null && !string.IsNullOrWhiteSpace(@event.Basket.CouponCode))
        {
            var code = @event.Basket.CouponCode.Trim().ToUpperInvariant();
            var coupon = await db.Coupons.SingleOrDefaultAsync(candidate => candidate.Code == code);
            var userUsage = await db.CouponRedemptions.CountAsync(item =>
                item.UserId == @event.UserId &&
                item.CouponCode == code &&
                (item.Status == StockReservationStatus.Reserved || item.Status == StockReservationStatus.Consumed));

            if (coupon is null || !coupon.IsRedeemable(DateTime.UtcNow) || userUsage >= coupon.PerUserLimit)
            {
                rejection = "Coupon usage limit was reached.";
            }
            else
            {
                coupon.UsedCount += 1; // reservations count against the finite quota
                db.CouponRedemptions.Add(new CouponRedemption
                {
                    OrderId = orderId,
                    UserId = @event.UserId,
                    CouponCode = code
                });
            }
        }

        if (rejection is not null)
        {
            await transaction.RollbackAsync();
            db.ChangeTracker.Clear();
            logger.LogWarning("Stock reservation rejected for {OrderId}: {Reason}", orderId, rejection);
            db.Enqueue(new StockReservationRejectedIntegrationEvent(orderId, rejection));
            await db.SaveChangesAsync();
            return;
        }

        foreach (var change in stockChanges)
        {
            var product = products[change.ProductId];
            db.Enqueue(new ProductStockChangedIntegrationEvent(product.Id, product.TotalStock, change.OldStock));
        }
        db.Enqueue(new StockReservationConfirmedIntegrationEvent(orderId));

        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        logger.LogInformation("Reserved {LineCount} stock lines for order {OrderId}.", lines.Count, orderId);
        });
    }
}
