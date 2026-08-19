using BasketService.Api.Core.Application.Repository;
using BasketService.Api.Core.Domain.Models;
using Newtonsoft.Json;
using StackExchange.Redis;

namespace BasketService.Api.Infrastructure.Repository
{
    public sealed class RedisBasketRepository : IBasketRepository
    {
        private const string BasketKeyPrefix = "basket:";
        private const string WishlistKeyPrefix = "wishlist:";
        private const string CheckoutKeyPrefix = "checkout:";

        /// <summary>Abandoned baskets expire instead of growing forever.</summary>
        private static readonly TimeSpan BasketTtl = TimeSpan.FromDays(30);

        /// <summary>Favourites are kept much longer than a basket.</summary>
        private static readonly TimeSpan WishlistTtl = TimeSpan.FromDays(365);

        /// <summary>Window in which a repeated checkout request id is treated as a duplicate.</summary>
        private static readonly TimeSpan CheckoutIdempotencyTtl = TimeSpan.FromHours(24);

        private readonly ILogger<RedisBasketRepository> logger;
        private readonly IDatabase database;

        public RedisBasketRepository(ILogger<RedisBasketRepository> logger, IConnectionMultiplexer redis)
        {
            this.logger = logger;
            database = redis.GetDatabase();
        }

        public async Task<CustomerBasket?> GetBasketAsync(string customerId)
        {
            var data = await database.StringGetAsync(BasketKey(customerId));

            return data.IsNullOrEmpty ? null : JsonConvert.DeserializeObject<CustomerBasket>(data!);
        }

        public async Task<CustomerBasket?> UpdateBasketAsync(CustomerBasket basket)
        {
            basket.UpdatedAtUtc = DateTime.UtcNow;

            var created = await database.StringSetAsync(
                BasketKey(basket.BuyerId),
                JsonConvert.SerializeObject(basket),
                BasketTtl);

            if (!created)
            {
                logger.LogWarning("Could not persist basket for {BuyerId}.", basket.BuyerId);
                return null;
            }

            return await GetBasketAsync(basket.BuyerId);
        }

        public Task<bool> DeleteBasketAsync(string customerId) =>
            database.KeyDeleteAsync(BasketKey(customerId));

        public async Task<CustomerWishlist> GetWishlistAsync(string customerId)
        {
            var data = await database.StringGetAsync(WishlistKey(customerId));

            return data.IsNullOrEmpty
                ? new CustomerWishlist(customerId)
                : JsonConvert.DeserializeObject<CustomerWishlist>(data!) ?? new CustomerWishlist(customerId);
        }

        public async Task<CustomerWishlist> UpdateWishlistAsync(CustomerWishlist wishlist)
        {
            wishlist.UpdatedAtUtc = DateTime.UtcNow;

            await database.StringSetAsync(
                WishlistKey(wishlist.BuyerId),
                JsonConvert.SerializeObject(wishlist),
                WishlistTtl);

            return wishlist;
        }

        public Task<bool> TryRegisterCheckoutAsync(string customerId, string requestId) =>
            // SET NX: succeeds only the first time this request id is seen.
            database.StringSetAsync(
                CheckoutKey(customerId, requestId),
                DateTime.UtcNow.ToString("O"),
                CheckoutIdempotencyTtl,
                When.NotExists);

        private static string BasketKey(string customerId) => BasketKeyPrefix + customerId;

        private static string WishlistKey(string customerId) => WishlistKeyPrefix + customerId;

        private static string CheckoutKey(string customerId, string requestId) =>
            $"{CheckoutKeyPrefix}{customerId}:{requestId}";
    }
}
