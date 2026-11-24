using CatalogService.Api.Core.Domain;
using CatalogService.Api.Infrastructure.Context;
using CatalogService.Api.IntegrationEvents.Events;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace CatalogService.Api.Infastructure;

/// <summary>Returns abandoned stock/coupon holds and cancels their unpaid orders.</summary>
public sealed class StockReservationExpiryWorker : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(30);
    private readonly IServiceScopeFactory scopeFactory;
    private readonly ILogger<StockReservationExpiryWorker> logger;

    public StockReservationExpiryWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<StockReservationExpiryWorker> logger)
    {
        this.scopeFactory = scopeFactory;
        this.logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(PollInterval);

        do
        {
            try
            {
                await ExpireBatch(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Stock reservation expiry pass failed.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task ExpireBatch(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CatalogContext>();
        var now = DateTime.UtcNow;

        var orderIds = await db.StockReservations.AsNoTracking()
            .Where(item => item.Status == StockReservationStatus.Reserved && item.ExpiresAtUtc <= now)
            .OrderBy(item => item.ExpiresAtUtc)
            .Select(item => item.OrderId)
            .Distinct()
            .Take(50)
            .ToListAsync(cancellationToken);

        foreach (var orderId in orderIds)
        {
            try
            {
                await ExpireOrder(db, orderId, now, cancellationToken);
            }
            catch (Exception exception)
            {
                db.ChangeTracker.Clear();
                logger.LogError(exception, "Could not expire reservation for order {OrderId}.", orderId);
            }
        }
    }

    private static async Task ExpireOrder(
        CatalogContext db,
        Guid orderId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var executionStrategy = db.Database.CreateExecutionStrategy();
        await executionStrategy.ExecuteAsync(async () =>
        {
        db.ChangeTracker.Clear();
        await using var transaction = await db.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var reservations = await db.StockReservations
            .Where(item => item.OrderId == orderId &&
                           item.Status == StockReservationStatus.Reserved &&
                           item.ExpiresAtUtc <= now)
            .ToListAsync(cancellationToken);

        if (reservations.Count == 0)
        {
            await transaction.RollbackAsync(cancellationToken);
            return;
        }

        var productIds = reservations.Select(item => item.ProductId).Distinct().ToList();
        var products = await db.CatalogItems
            .Include(product => product.Variants)
            .Where(product => productIds.Contains(product.Id))
            .ToDictionaryAsync(product => product.Id, cancellationToken);

        foreach (var productGroup in reservations.GroupBy(item => item.ProductId))
        {
            var product = products[productGroup.Key];
            var oldStock = product.TotalStock;

            foreach (var reservation in productGroup)
            {
                if (reservation.VariantId is { } variantId)
                    product.Variants.Single(variant => variant.Id == variantId).Stock += reservation.Quantity;
                else
                    product.AvailableStock += reservation.Quantity;

                reservation.Status = StockReservationStatus.Expired;
                reservation.SettledAtUtc = now;
            }

            product.OnReorder = product.TotalStock <= product.RestockThreshold;
            product.UpdatedAtUtc = now;
            db.Enqueue(new ProductStockChangedIntegrationEvent(product.Id, product.TotalStock, oldStock));
        }

        var couponReservation = await db.CouponRedemptions
            .SingleOrDefaultAsync(item => item.OrderId == orderId &&
                                          item.Status == StockReservationStatus.Reserved,
                cancellationToken);

        if (couponReservation is not null)
        {
            var coupon = await db.Coupons.SingleAsync(
                item => item.Code == couponReservation.CouponCode,
                cancellationToken);
            coupon.UsedCount = Math.Max(0, coupon.UsedCount - 1);
            couponReservation.Status = StockReservationStatus.Expired;
            couponReservation.SettledAtUtc = now;
        }

        db.Enqueue(new StockReservationRejectedIntegrationEvent(
            orderId,
            "Stock reservation expired before payment completed."));

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        });
    }
}
