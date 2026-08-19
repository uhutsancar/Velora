using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Velora.Shared.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Velora.Shared.Security
{
    /// <summary>
    /// One JWT + authorization wiring used by every resource service, so a token
    /// issued by IdentityService is validated identically everywhere.
    /// </summary>
    public static class JwtAuthRegistration
    {
        public static IServiceCollection AddVeloraJwtAuth(
            this IServiceCollection services,
            IConfiguration configuration,
            IHostEnvironment environment)
        {
            // Keep the raw claim types coming off the wire instead of the legacy SOAP mapping.
            JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

            // Refuses a missing, too-short, or still-placeholder key outside Development.
            var secret = VeloraSecrets.RequireSigningKey(configuration, environment);

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));

            services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                })
                .AddJwtBearer(options =>
                {
                    options.RequireHttpsMetadata = false;
                    options.SaveToken = true;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = signingKey,
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        ValidateLifetime = true,
                        RequireExpirationTime = true,
                        ClockSkew = TimeSpan.FromSeconds(30),
                        RoleClaimType = ClaimTypes.Role,
                        NameClaimType = ClaimTypes.Name
                    };
                });

            services.AddVeloraAuthorization();

            return services;
        }

        public static IServiceCollection AddVeloraAuthorization(this IServiceCollection services)
        {
            services.AddAuthorization(options =>
            {
                options.AddPolicy(VeloraPolicies.AdminOnly, policy => policy.RequireRole(VeloraRoles.Admin));
                options.AddPolicy(VeloraPolicies.BackOffice, policy => policy.RequireRole(VeloraRoles.Admin, VeloraRoles.Manager));

                foreach (var code in VeloraPermissions.All.Keys)
                {
                    options.AddPolicy(VeloraPolicies.Permission(code), policy =>
                        policy.RequireAssertion(ctx =>
                            // Admin is a superuser; everyone else needs the explicit claim.
                            ctx.User.IsInRole(VeloraRoles.Admin) ||
                            ctx.User.HasClaim(VeloraPermissions.ClaimType, code)));
                }
            });

            return services;
        }
    }

    public static class ClaimsPrincipalExtensions
    {
        public static Guid GetUserId(this ClaimsPrincipal principal) =>
            principal.TryGetUserId(out var id)
                ? id
                : throw new UnauthorizedAccessException("The token does not carry a valid user id.");

        public static bool TryGetUserId(this ClaimsPrincipal principal, out Guid userId)
        {
            var raw = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub);

            return Guid.TryParse(raw, out userId);
        }

        /// <summary>User id as string; falls back to the raw claim for legacy tokens.</summary>
        public static string GetUserKey(this ClaimsPrincipal principal) =>
            principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new UnauthorizedAccessException("The token does not carry a user identifier.");

        public static string? GetDisplayName(this ClaimsPrincipal principal) =>
            principal.FindFirstValue(ClaimTypes.Name) ?? principal.FindFirstValue("username");

        public static string? GetEmail(this ClaimsPrincipal principal) =>
            principal.FindFirstValue(ClaimTypes.Email);

        public static bool IsAdmin(this ClaimsPrincipal principal) => principal.IsInRole(VeloraRoles.Admin);
    }
}
