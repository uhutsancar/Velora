using BasketService.Api.Core.Application.Repository;
using BasketService.Api.Core.Domain.Models;
using Newtonsoft.Json;
using StackExchange.Redis;
using Velora.Shared.Middleware;

namespace BasketService.Api.Infrastructure.Repository
{
    public sealed class RedisBasketRepository : IBasketRepository
    {
        private const string BasketKeyPrefix = "basket:";
        private const string WishlistKeyPrefix = "wishlist:";
        private const string CheckoutKeyPrefix = "checkout:";
        private const string CheckoutLockKeyPrefix = "checkout-lock:";

        /// <summary>Abandoned baskets expire instead of growing forever.</summary>
        private static readonly TimeSpan BasketTtl = TimeSpan.FromDays(30);

        /// <summary>Favourites are kept much longer than a basket.</summary>
        private static readonly TimeSpan WishlistTtl = TimeSpan.FromDays(365);

        /// <summary>Window in which a repeated checkout request id is treated as a duplicate.</summary>
        private static readonly TimeSpan CheckoutIdempotencyTtl = TimeSpan.FromDays(365);

        private static readonly TimeSpan CheckoutLockTtl = TimeSpan.FromMinutes(2);

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
            const string compareAndSetScript = """
                local current = redis.call('get', KEYS[1])
                if current then
                    local decoded = cjson.decode(current)
                    local currentVersion = tonumber(decoded.Version or decoded.version or 0)
                    if currentVersion ~= tonumber(ARGV[1]) then return 0 end
                elseif tonumber(ARGV[1]) ~= 0 then
                    return 0
                end
                redis.call('set', KEYS[1], ARGV[2], 'EX', ARGV[3])
                return 1
                """;

            var expectedVersion = basket.Version;
            basket.Version = expectedVersion + 1;
            basket.UpdatedAtUtc = DateTime.UtcNow;

            var result = (long)await database.ScriptEvaluateAsync(
                compareAndSetScript,
                new RedisKey[] { BasketKey(basket.BuyerId) },
                new RedisValue[]
                {
                    expectedVersion,
                    JsonConvert.SerializeObject(basket),
                    (long)BasketTtl.TotalSeconds
                });

            if (result != 1)
            {
                basket.Version = expectedVersion;
                logger.LogWarning("Concurrent basket update rejected for {BuyerId} at version {Version}.",
                    basket.BuyerId,
                    expectedVersion);
                throw new ApiException(
                    "The basket changed in another request. Refresh and retry.",
                    409,
                    "basket_version_conflict");
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

        public Task<bool> TryRegisterCheckoutAsync(string customerId, string requestId, string requestHash) =>
            // SET NX: succeeds only the first time this request id is seen.
            database.StringSetAsync(
                CheckoutKey(customerId, requestId),
                requestHash,
                CheckoutIdempotencyTtl,
                When.NotExists);

        public async Task<string?> GetCheckoutHashAsync(string customerId, string requestId)
        {
            var value = await database.StringGetAsync(CheckoutKey(customerId, requestId));
            return value.IsNullOrEmpty ? null : value.ToString();
        }

        public async Task<string?> TryAcquireCheckoutLockAsync(string customerId, string requestId)
        {
            var token = Guid.NewGuid().ToString("N");
            var acquired = await database.StringSetAsync(
                CheckoutLockKey(customerId, requestId),
                token,
                CheckoutLockTtl,
                When.NotExists);

            return acquired ? token : null;
        }

        public async Task ReleaseCheckoutLockAsync(string customerId, string requestId, string lockToken)
        {
            const string releaseScript =
                "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

            await database.ScriptEvaluateAsync(
                releaseScript,
                new RedisKey[] { CheckoutLockKey(customerId, requestId) },
                new RedisValue[] { lockToken });
        }

        private static string BasketKey(string customerId) => BasketKeyPrefix + customerId;

        private static string WishlistKey(string customerId) => WishlistKeyPrefix + customerId;

        private static string CheckoutKey(string customerId, string requestId) =>
            $"{CheckoutKeyPrefix}{customerId}:{requestId}";

        private static string CheckoutLockKey(string customerId, string requestId) =>
            $"{CheckoutLockKeyPrefix}{customerId}:{requestId}";
    }
}
