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

        public static IServiceCollection AddPersistenceRegistration(
            this IServiceCollection services,
            IConfiguration configuration,
            IHostEnvironment environment)
        {
            // Historically a flat key rather than a ConnectionStrings entry; RequireConnectionString
            // accepts both, so OrderDbConnectionString and ConnectionStrings:OrderDbConnectionString work.
            var connectionString = VeloraSecrets.RequireConnectionString(
                configuration, environment, "OrderDbConnectionString", () => DevelopmentConnection);

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
