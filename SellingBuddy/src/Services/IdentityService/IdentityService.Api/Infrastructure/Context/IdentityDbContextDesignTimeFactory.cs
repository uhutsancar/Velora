using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace IdentityService.Api.Infrastructure.Context
{
    /// <summary>
    /// Used only by the EF Core CLI (dotnet ef migrations / database update). Building the
    /// application host at design time would drag in the broker, Consul and the secret
    /// validation, none of which a schema diff needs.
    ///
    /// Override the target database with the environment variable
    /// <c>VELORA_IDENTITY_CONNECTION</c>.
    /// </summary>
    public sealed class IdentityDbContextDesignTimeFactory : IDesignTimeDbContextFactory<IdentityDbContext>
    {
        private const string DefaultConnection =
            "Data Source=localhost,1444;Initial Catalog=velora_identity;Persist Security Info=True;User ID=sa;Password=UhutSancar123!;TrustServerCertificate=True;";

        public IdentityDbContext CreateDbContext(string[] args)
        {
            var connectionString = Environment.GetEnvironmentVariable("VELORA_IDENTITY_CONNECTION") ?? DefaultConnection;

            var options = new DbContextOptionsBuilder<IdentityDbContext>()
                .UseSqlServer(connectionString, sql => sql.MigrationsAssembly("IdentityService.Api"))
                .Options;

            return new IdentityDbContext(options);
        }
    }
}
