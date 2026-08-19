using IdentityService.Api.Infrastructure.Context;
using Microsoft.EntityFrameworkCore;
using Velora.Shared.Configuration;

namespace IdentityService.Api.Extensions.Registration
{
    public static class DbContextRegistration
    {
        /// <summary>Local default so a fresh clone runs against the compose SQL Server with no setup.</summary>
        private const string DevelopmentConnection =
            "Data Source=localhost,1444;Initial Catalog=velora_identity;Persist Security Info=True;User ID=sa;Password=UhutSancar123!;TrustServerCertificate=True;";

        public static IServiceCollection ConfigureDbContext(
            this IServiceCollection services,
            IConfiguration configuration,
            IHostEnvironment environment)
        {
            var connectionString = VeloraSecrets.RequireConnectionString(
                configuration, environment, "IdentityConnection", DevelopmentConnection);

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
