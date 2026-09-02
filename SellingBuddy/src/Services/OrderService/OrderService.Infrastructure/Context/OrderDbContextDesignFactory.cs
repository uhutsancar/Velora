using Velora.Shared.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace OrderService.Infrastructure.Context
{
    /// <summary>
    /// Used only by the EF Core CLI (dotnet ef migrations / database update). Building the
    /// application host at design time would drag in the broker, Consul and the secret
    /// validation, none of which a schema diff needs.
    ///
    /// Override the target database with the environment variable
    /// <c>VELORA_ORDER_CONNECTION</c>.
    /// </summary>
    public sealed class OrderDbContextDesignFactory : IDesignTimeDbContextFactory<OrderDbContext>
    {
        private static string DefaultConnection => LocalDevSecrets.SqlConnection("velora_order");

        public OrderDbContext CreateDbContext(string[] args)
        {
            var connectionString = Environment.GetEnvironmentVariable("VELORA_ORDER_CONNECTION") ?? DefaultConnection;

            var options = new DbContextOptionsBuilder<OrderDbContext>()
                .UseSqlServer(connectionString, sql => sql.MigrationsAssembly("OrderService.Infrastructure"))
                .Options;

            // Domain events are dispatched through the mediator at save time; a schema diff
            // never saves, so the null overload is enough here.
            return new OrderDbContext(options, mediator: null);
        }
    }
}
