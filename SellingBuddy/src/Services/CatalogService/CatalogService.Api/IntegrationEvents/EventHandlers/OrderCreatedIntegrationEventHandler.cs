using CatalogService.Api.Infrastructure.Context;
using CatalogService.Api.IntegrationEvents.Events;
using EventBus.Base.Abstraction;
using Microsoft.EntityFrameworkCore;

namespace CatalogService.Api.IntegrationEvents.EventHandlers
{
    /// <summary>
    /// Reserves stock when a checkout is accepted. Runs in the catalogue service because
    /// inventory belongs to the merchandising bounded context, not to ordering.
    /// </summary>
    public class OrderCreatedIntegrationEventHandler : IIntegrationEventHandler<OrderCreatedIntegrationEvent>
    {
        private readonly CatalogContext db;
        private readonly IEventBus eventBus;
        private readonly ILogger<OrderCreatedIntegrationEventHandler> logger;

        public OrderCreatedIntegrationEventHandler(
            CatalogContext db,
            IEventBus eventBus,
            ILogger<OrderCreatedIntegrationEventHandler> logger)
        {
            this.db = db;
            this.eventBus = eventBus;
            this.logger = logger;
        }

        public async Task Handle(OrderCreatedIntegrationEvent @event)
        {
            if (@event.Basket?.Items is not { Count: > 0 } items)
            {
                logger.LogWarning("OrderCreated event {EventId} carried an empty basket.", @event.Id);
                return;
            }

            var productIds = items.Select(i => i.ProductId).Distinct().ToList();

            var products = await db.CatalogItems
                .Include(p => p.Variants)
                .Where(p => productIds.Contains(p.Id))
                .ToListAsync();

            foreach (var group in items.GroupBy(i => i.ProductId))
            {
                var product = products.FirstOrDefault(p => p.Id == group.Key);
                if (product is null)
                {
                    logger.LogWarning("Order references unknown product {ProductId}.", group.Key);
                    continue;
                }

                var oldStock = product.TotalStock;

                foreach (var line in group)
                {
                    var variant = line.VariantId is { } variantId
                        ? product.Variants.FirstOrDefault(v => v.Id == variantId)
                        : null;

                    if (variant is not null)
                        variant.Stock = Math.Max(0, variant.Stock - line.Quantity);
                    else
                        DeductUnallocated(product, line.Quantity);

                    product.SoldCount += line.Quantity;
                }

                product.OnReorder = product.TotalStock <= product.RestockThreshold;
                product.UpdatedAtUtc = DateTime.UtcNow;

                eventBus.Publish(new ProductStockChangedIntegrationEvent(product.Id, product.TotalStock, oldStock));
            }

            await db.SaveChangesAsync();

            logger.LogInformation("Stock adjusted for {Count} products from order event {EventId}.", productIds.Count, @event.Id);
        }

        /// <summary>
        /// Removes stock for a line that names no variant.
        ///
        /// A variant product reports <c>TotalStock</c> from its variants, so decrementing
        /// only <c>AvailableStock</c> would leave the advertised stock untouched. Take the
        /// units from the best-stocked variants instead, so inventory stays truthful even
        /// when a line arrives without a variant id.
        /// </summary>
        private static void DeductUnallocated(Core.Domain.CatalogItem product, int quantity)
        {
            var variants = product.Variants.Where(v => v.IsActive && v.Stock > 0)
                .OrderByDescending(v => v.Stock)
                .ToList();

            if (variants.Count == 0)
            {
                product.AvailableStock = Math.Max(0, product.AvailableStock - quantity);
                return;
            }

            var remaining = quantity;

            foreach (var variant in variants)
            {
                if (remaining <= 0) break;

                var taken = Math.Min(variant.Stock, remaining);
                variant.Stock -= taken;
                remaining -= taken;
            }

            // Anything the variants could not cover comes off the base stock.
            if (remaining > 0)
                product.AvailableStock = Math.Max(0, product.AvailableStock - remaining);
        }
    }
}
