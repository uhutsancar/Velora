using StackExchange.Redis;

namespace BasketService.Api.Extensions
{
    public static class RedisRegistration
    {
        public static IConnectionMultiplexer ConfigureRedis(this IServiceProvider services, IConfiguration configuration)
        {
            var connectionString = configuration["RedisSettings:ConnectionString"]
                                   ?? throw new InvalidOperationException("RedisSettings:ConnectionString is not configured.");

            var options = ConfigurationOptions.Parse(connectionString, true);
            options.ResolveDns = true;
            options.AbortOnConnectFail = false;
            options.ConnectRetry = 5;

            return ConnectionMultiplexer.Connect(options);
        }
    }
}
