using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OrderService.Domain.AggregateModels.BuyerAggregate;
using OrderService.Domain.AggregateModels.OrderAggregate;
using OrderService.Domain.SeedWork;
using Polly;
using Polly.Retry;

namespace OrderService.Infrastructure.Context
{
    /// <summary>
    /// Seeds the enumeration lookup tables (card types, order statuses).
    /// Idempotent and safe to run on every start-up.
    /// </summary>
    public class OrderDbContextSeed
    {
        public async Task SeedAsync(OrderDbContext context, ILogger logger)
        {
            var policy = CreatePolicy(logger, nameof(OrderDbContextSeed));

            await policy.ExecuteAsync(async () =>
            {
                // NOTE: the context is owned by the DI scope; disposing it here would
                // break the rest of the start-up pipeline.
                if (!await context.CardTypes.AnyAsync())
                {
                    context.CardTypes.AddRange(Enumeration.GetAll<CardType>());
                    await context.SaveChangesAsync();
                }

                if (!await context.OrderStatus.AnyAsync())
                {
                    context.OrderStatus.AddRange(OrderStatus.List());
                    await context.SaveChangesAsync();
                }
            });
        }

        private static AsyncRetryPolicy CreatePolicy(ILogger logger, string prefix, int retries = 3) =>
            Policy.Handle<SqlException>()
                .WaitAndRetryAsync(
                    retryCount: retries,
                    sleepDurationProvider: _ => TimeSpan.FromSeconds(5),
                    onRetry: (exception, _, retry, _) =>
                        logger.LogWarning(exception, "[{Prefix}] attempt {Retry} of {Retries} failed", prefix, retry, retries));
    }
}
