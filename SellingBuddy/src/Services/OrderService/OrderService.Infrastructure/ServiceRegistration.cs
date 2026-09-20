using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using OrderService.Application.Interfaces.Repositories;
using Velora.Shared.Configuration;
using OrderService.Infrastructure.Context;
using OrderService.Infrastructure.Repositories;

namespace OrderService.Infrastructure
{
    public static class ServiceRegistration
    {
        /// <summary>Local default so a fresh clone runs against the compose SQL Server with no setup.</summary>
        private static string DevelopmentConnection => LocalDevSecrets.SqlConnection("velora_order");

        /// <summary>
        /// The connection string the DbContext actually uses.
        ///
        /// Health checks must resolve it through here instead of reading configuration
        /// directly: the key is deliberately blank in appsettings.json and supplied by
        /// the development fallback, so a plain lookup comes back empty and
        /// AddVeloraHealthChecks silently skips the SQL check - the database then drops
        /// out of readiness entirely and an outage reports itself as healthy.
        /// </summary>
        public static string ResolveConnectionString(
            IConfiguration configuration,
            IHostEnvironment environment) =>
            VeloraSecrets.RequireConnectionString(
                configuration, environment, "OrderDbConnectionString", () => DevelopmentConnection);

        public static IServiceCollection AddPersistenceRegistration(
            this IServiceCollection services,
            IConfiguration configuration,
            IHostEnvironment environment)
        {
            // Historically a flat key rather than a ConnectionStrings entry; RequireConnectionString
            // accepts both, so OrderDbConnectionString and ConnectionStrings:OrderDbConnectionString work.
            var connectionString = ResolveConnectionString(configuration, environment);

            services.AddDbContext<OrderDbContext>(options =>
            {
                options.UseSqlServer(connectionString, sql =>
                    sql.EnableRetryOnFailure(maxRetryCount: 10, maxRetryDelay: TimeSpan.FromSeconds(15), errorNumbersToAdd: null));

                // Parameter values would end up in the logs, so this stays development-only.
                if (environment.IsDevelopment())
                    options.EnableSensitiveDataLogging();
            });

            services.AddScoped<IBuyerRepository, BuyerRepository>();
            services.AddScoped<IOrderRepository, OrderRepository>();

            // Schema creation and seeding happen once at start-up in Program.cs,
            // not as a side effect of registering services.
            return services;
        }
    }
}
