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
        private const string DevelopmentConnection =
            "Data Source=localhost,1444;Initial Catalog=velora_catalog;Persist Security Info=True;User ID=sa;Password=UhutSancar123!;TrustServerCertificate=True;";

        public static IServiceCollection ConfigureDbContext(
            this IServiceCollection services,
            IConfiguration configuration,
            IHostEnvironment environment)
        {
            var connectionString = VeloraSecrets.RequireConnectionString(
                configuration, environment, "CatalogConnection", DevelopmentConnection);

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
