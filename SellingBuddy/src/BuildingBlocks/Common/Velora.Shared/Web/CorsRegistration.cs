using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Velora.Shared.Web
{
    /// <summary>
    /// CORS for the two Velora frontends. Origins come from configuration
    /// (Cors:AllowedOrigins) so production can lock them down without a code change.
    /// </summary>
    public static class CorsRegistration
    {
        public const string PolicyName = "velora-clients";

        private static readonly string[] DevelopmentOrigins =
        {
            "http://localhost:5173", // storefront (vite)
            "http://localhost:5174", // admin (vite)
            "http://localhost:4173",
            "http://localhost:4174"
        };

        public static IServiceCollection ConfigureCors(this IServiceCollection services, IConfiguration configuration)
        {
            var configured = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
            var origins = configured is { Length: > 0 } ? configured : DevelopmentOrigins;

            services.AddCors(options =>
            {
                options.AddPolicy(PolicyName, policy => policy
                    .WithOrigins(origins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials()
                    .WithExposedHeaders("x-request-id", "x-total-count"));
            });

            return services;
        }
    }
}
