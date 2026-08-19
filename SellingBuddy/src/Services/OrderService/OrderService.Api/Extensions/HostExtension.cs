using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Polly;
using System;

namespace OrderService.Api.Extensions
{
    public static class HostExtension
    {
        /// <summary>
        /// Applies pending EF Core migrations and runs the seeder, retrying while SQL Server
        /// finishes booting (typical when the whole stack starts from docker compose).
        ///
        /// Migrate() and not EnsureCreated(): EnsureCreated bypasses the migrations history
        /// table, so a database it created can never be migrated afterwards.
        ///
        /// A failure is logged and swallowed in Development so the API still starts for
        /// front-end work; anywhere else it stops the process rather than serving traffic
        /// against a schema that does not match the model.
        /// </summary>
        public static IHost MigrateDbContext<TContext>(this IHost host, Action<TContext, IServiceProvider> seeder)
            where TContext : DbContext
        {
            using var scope = host.Services.CreateScope();

            var services = scope.ServiceProvider;
            var logger = services.GetRequiredService<ILogger<TContext>>();
            var environment = services.GetRequiredService<IHostEnvironment>();
            var context = services.GetRequiredService<TContext>();

            try
            {
                logger.LogInformation("Migrating database for {DbContextName}", typeof(TContext).Name);

                var retry = Policy.Handle<SqlException>()
                    .WaitAndRetry(new[]
                    {
                        TimeSpan.FromSeconds(3),
                        TimeSpan.FromSeconds(5),
                        TimeSpan.FromSeconds(8),
                        TimeSpan.FromSeconds(13)
                    });

                retry.Execute(() =>
                {
                    context.Database.Migrate();
                    seeder(context, services);
                });

                logger.LogInformation("Database ready for {DbContextName}", typeof(TContext).Name);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Database preparation failed for {DbContextName}", typeof(TContext).Name);

                if (!environment.IsDevelopment())
                    throw;
            }

            return host;
        }
    }
}
