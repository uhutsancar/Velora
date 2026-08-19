using Velora.Shared.Discovery;

namespace CatalogService.Api.Extensions
{
    /// <summary>
    /// Thin wrapper over <see cref="VeloraConsulRegistration"/>, kept so the existing
    /// Program.cs calls stay unchanged while the logic lives in one place.
    /// </summary>
    public static class ConsulRegistration
    {
        private const string ServiceId = "CatalogService";

        public static IServiceCollection ConfigureConsul(this IServiceCollection services, IConfiguration configuration)
            => services.AddVeloraConsul(configuration);

        public static IApplicationBuilder RegisterWithConsul(this IApplicationBuilder app, IHostApplicationLifetime lifetime)
            => app.UseVeloraConsul(lifetime, ServiceId, "Catalog Service", "Catalog", "Products");
    }
}
