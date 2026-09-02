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
        /// <summary>
        /// Brute force koruması. Sinirlar yapilandirmadan okunur
        /// (RateLimit:Auth:PermitLimit / :WindowSeconds), cunku sabit bir deger
        /// uctan uca testleri engelliyordu: iki dogrulama scripti arka arkaya
        /// kayit ve giris yapinca dakikalik pencere doluyor ve testler
        /// uygulamada bir sorun yokken 429 aliyordu. Varsayilanlar degismedi,
        /// yalnizca CI kendi degerini verebiliyor.
        /// </summary>
        public static IServiceCollection ConfigureRateLimiting(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            var permitLimit = configuration.GetValue("RateLimit:Auth:PermitLimit", 10);
            var windowSeconds = configuration.GetValue("RateLimit:Auth:WindowSeconds", 60);

            services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                options.AddPolicy(RateLimitPolicies.Auth, context =>
                {
                    // Partition on client IP so one abusive caller cannot lock everyone out.
                    var key = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

                    return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = permitLimit,
                        Window = TimeSpan.FromSeconds(windowSeconds),
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
