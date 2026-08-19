using CatalogService.Api.Infrastructure.Context;
using CatalogService.Api.IntegrationEvents.Events;
using EventBus.Base.Abstraction;
using Microsoft.EntityFrameworkCore;

namespace CatalogService.Api.IntegrationEvents.EventHandlers
{
    /// <summary>
    /// Redeems the coupon once the money is actually collected.
    ///
    /// Redemption is deliberately tied to payment rather than to checkout: an order that
    /// is never paid must not burn a limited-use code. The increment is a single atomic
    /// UPDATE, so concurrent payments cannot lose a count to a read-modify-write race.
    /// </summary>
    public class OrderPaidIntegrationEventHandler : IIntegrationEventHandler<OrderPaidIntegrationEvent>
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
            if (string.IsNullOrWhiteSpace(@event.CouponCode))
                return;

            var code = @event.CouponCode.Trim().ToUpperInvariant();

            var affected = await db.Coupons
                .Where(c => c.Code == code)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.UsedCount, c => c.UsedCount + 1));

            if (affected == 0)
            {
                logger.LogWarning("Order {OrderNumber} was paid with unknown coupon {Code}.", @event.OrderNumber, code);
                return;
            }

            logger.LogInformation(
                "Coupon {Code} redeemed for order {OrderNumber} (discount {Discount}).",
                code, @event.OrderNumber, @event.DiscountAmount);
        }
    }
}
