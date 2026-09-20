using IdentityService.Api.Infrastructure.Context;
using Microsoft.EntityFrameworkCore;
using Velora.Shared.Configuration;

namespace IdentityService.Api.Extensions.Registration
{
    public static class DbContextRegistration
    {
        /// <summary>Local default so a fresh clone runs against the compose SQL Server with no setup.</summary>
        private static string DevelopmentConnection => LocalDevSecrets.SqlConnection("velora_identity");

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
                configuration, environment, "IdentityConnection", () => DevelopmentConnection);

        public static IServiceCollection ConfigureDbContext(
            this IServiceCollection services,
            IConfiguration configuration,
            IHostEnvironment environment)
        {
            var connectionString = ResolveConnectionString(configuration, environment);

            services.AddDbContext<IdentityDbContext>(options =>
                options.UseSqlServer(connectionString, sql =>
                {
                    sql.MigrationsAssembly(typeof(Program).Assembly.GetName().Name);
                    sql.EnableRetryOnFailure(maxRetryCount: 10, maxRetryDelay: TimeSpan.FromSeconds(15), errorNumbersToAdd: null);
                }));

            return services;
        }
    }
}
