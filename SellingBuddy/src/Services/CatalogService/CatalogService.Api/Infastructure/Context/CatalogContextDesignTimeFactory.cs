using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace CatalogService.Api.Infrastructure.Context
{
    /// <summary>
    /// Used only by the EF Core CLI (dotnet ef migrations / database update). Building the
    /// application host at design time would drag in the broker, Consul and the secret
    /// validation, none of which a schema diff needs.
    ///
    /// Override the target database with the environment variable
    /// <c>VELORA_CATALOG_CONNECTION</c>.
    /// </summary>
    public sealed class CatalogContextDesignTimeFactory : IDesignTimeDbContextFactory<CatalogContext>
    {
        private const string DefaultConnection =
            "Data Source=localhost,1444;Initial Catalog=velora_catalog;Persist Security Info=True;User ID=sa;Password=UhutSancar123!;TrustServerCertificate=True;";

        public CatalogContext CreateDbContext(string[] args)
        {
            var connectionString = Environment.GetEnvironmentVariable("VELORA_CATALOG_CONNECTION") ?? DefaultConnection;

            var options = new DbContextOptionsBuilder<CatalogContext>()
                .UseSqlServer(connectionString, sql => sql.MigrationsAssembly("CatalogService.Api"))
                .Options;

            return new CatalogContext(options);
        }
    }
}
