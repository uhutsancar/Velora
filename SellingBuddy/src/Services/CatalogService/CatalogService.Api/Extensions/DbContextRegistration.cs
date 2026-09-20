using CatalogService.Api.Infrastructure.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System;
using System.Reflection;
using Velora.Shared.Configuration;

namespace CatalogService.Api.Extensions
{
    public static class DbContextRegistration
    {
        /// <summary>Local default so a fresh clone runs against the compose SQL Server with no setup.</summary>
        private static string DevelopmentConnection => LocalDevSecrets.SqlConnection("velora_catalog");

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
                configuration, environment, "CatalogConnection", () => DevelopmentConnection);

        public static IServiceCollection ConfigureDbContext(
            this IServiceCollection services,
            IConfiguration configuration,
            IHostEnvironment environment)
        {
            var connectionString = ResolveConnectionString(configuration, environment);

            services.AddEntityFrameworkSqlServer()
                .AddDbContext<CatalogContext>(options =>
                {
                    options.UseSqlServer(connectionString,
                        sqlServerOptionsAction: sqlOptions =>
                        {
                            sqlOptions.MigrationsAssembly(typeof(Program).GetTypeInfo().Assembly.GetName().Name);
                            sqlOptions.EnableRetryOnFailure(maxRetryCount: 15, maxRetryDelay: TimeSpan.FromSeconds(30), errorNumbersToAdd: null);
                        });
                });

            return services;
        }
    }
}
