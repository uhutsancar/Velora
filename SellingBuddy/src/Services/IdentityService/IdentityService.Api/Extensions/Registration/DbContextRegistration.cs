using IdentityService.Api.Infrastructure.Context;
using Microsoft.EntityFrameworkCore;
using Velora.Shared.Configuration;

namespace IdentityService.Api.Extensions.Registration
{
    public static class DbContextRegistration
    {
        /// <summary>Local default so a fresh clone runs against the compose SQL Server with no setup.</summary>
        private static string DevelopmentConnection => LocalDevSecrets.SqlConnection("velora_identity");

        public static IServiceCollection ConfigureDbContext(
            this IServiceCollection services,
            IConfiguration configuration,
            IHostEnvironment environment)
        {
            var connectionString = VeloraSecrets.RequireConnectionString(
                configuration, environment, "IdentityConnection", () => DevelopmentConnection);

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
