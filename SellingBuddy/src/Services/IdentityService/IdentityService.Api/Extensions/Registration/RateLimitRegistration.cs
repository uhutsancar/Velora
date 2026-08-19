using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

namespace IdentityService.Api.Extensions.Registration
{
    public static class RateLimitPolicies
    {
        /// <summary>Applied to login/register/refresh: brute force protection.</summary>
        public const string Auth = "auth";
    }

    public static class RateLimitRegistration
    {
        public static IServiceCollection ConfigureRateLimiting(this IServiceCollection services)
        {
            services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                options.AddPolicy(RateLimitPolicies.Auth, context =>
                {
                    // Partition on client IP so one abusive caller cannot lock everyone out.
                    var key = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

                    return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst
                    });
                });

                options.OnRejected = async (context, token) =>
                {
                    context.HttpContext.Response.ContentType = "application/json";
                    await context.HttpContext.Response.WriteAsync(
                        "{\"code\":\"too_many_requests\",\"message\":\"Too many attempts. Please wait a minute and try again.\"}",
                        token);
                };
            });

            return services;
        }
    }
}
