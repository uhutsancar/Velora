using IdentityService.Api.Application.Services;
using Velora.Shared.Configuration;
using Velora.Shared.Security;

namespace IdentityService.Api.Extensions.Registration
{
    public static class AuthRegistration
    {
        public static IServiceCollection ConfigureAuth(
            this IServiceCollection services,
            IConfiguration configuration,
            IHostEnvironment environment)
        {
            // The same validated key both signs tokens here and validates them everywhere else;
            // binding the section alone would let the two drift apart if the key were unset.
            var secret = VeloraSecrets.RequireSigningKey(configuration, environment);

            services.Configure<AuthOptions>(options =>
            {
                configuration.GetSection(AuthOptions.SectionName).Bind(options);
                options.Secret = secret;
            });

            services.AddVeloraJwtAuth(configuration, environment);

            return services;
        }
    }
}
