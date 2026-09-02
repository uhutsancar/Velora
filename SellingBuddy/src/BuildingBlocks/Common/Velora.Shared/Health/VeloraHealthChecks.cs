using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Text.Json;

namespace Velora.Shared.Health
{
    /// <summary>
    /// The three health endpoints Kubernetes needs, registered once for every service.
    ///
    /// Kubernetes asks three different questions and they must not share an answer:
    ///
    ///   /health/live     Is the process wedged?      Failure => the pod is KILLED.
    ///   /health/ready    Can it serve traffic?       Failure => taken out of the
    ///                                                Service pool, but left alive.
    ///   /health/startup  Has it finished booting?    Holds the other two off.
    ///
    /// The decisive rule: liveness checks NOTHING external. If liveness touched SQL,
    /// a thirty-second database hiccup would fail it on every replica at once and
    /// Kubernetes would restart the whole deployment - turning a brief dependency
    /// blip into a self-inflicted outage. Readiness is where dependencies belong:
    /// it removes a pod from load balancing and puts it back when the dependency
    /// recovers, without ever killing the process.
    ///
    /// Checks are registered only for dependencies a given service actually has:
    /// the configuration decides, so Payment (bus only) and Catalog (SQL + bus)
    /// each get the right set from the same call.
    /// </summary>
    public static class VeloraHealthChecks
    {
        /// <summary>Tag marking a check that gates readiness.</summary>
        public const string ReadyTag = "ready";

        /// <param name="sqlConnectionString">
        /// The already-resolved connection string, or null for services without a
        /// database. It is passed in rather than looked up by name because the
        /// services do not agree on where it lives - Catalog and Identity use
        /// ConnectionStrings:*, while Order keeps a flat OrderDbConnectionString
        /// key. Reading it at the call site keeps that difference visible instead
        /// of silently skipping the check when a name does not match.
        /// </param>
        public static IServiceCollection AddVeloraHealthChecks(
            this IServiceCollection services,
            IConfiguration configuration,
            string? sqlConnectionString = null)
        {
            var builder = services.AddHealthChecks();
            var ready = new[] { ReadyTag };

            if (!string.IsNullOrWhiteSpace(sqlConnectionString))
            {
                builder.AddSqlServer(sqlConnectionString, name: "sql", tags: ready);
            }

            var redis = configuration["RedisSettings:ConnectionString"];
            if (!string.IsNullOrWhiteSpace(redis))
            {
                builder.AddRedis(redis, name: "redis", tags: ready);
            }

            // Only the RabbitMQ transport is probed here; when EventBus:Type is
            // AzureServiceBus the broker is managed and has its own health surface.
            var busType = configuration["EventBus:Type"] ?? "RabbitMQ";
            var busHost = configuration["EventBus:HostName"];

            if (busType.Equals("RabbitMQ", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(busHost))
            {
                var port = configuration.GetValue("EventBus:Port", 5672);
                var user = configuration["EventBus:UserName"] ?? "guest";
                var password = configuration["EventBus:Password"] ?? "guest";

                var uri = new Uri($"amqp://{Uri.EscapeDataString(user)}:{Uri.EscapeDataString(password)}@{busHost}:{port}/");
                builder.AddRabbitMQ(uri, name: "bus", tags: ready);
            }

            return services;
        }

        /// <summary>
        /// Maps the probe endpoints. <paramref name="serviceName"/> keeps the legacy
        /// <c>/health</c> payload byte-identical, because docker-compose, the Consul
        /// check and scripts/verify-stack.py all read it.
        /// </summary>
        public static IEndpointRouteBuilder MapVeloraHealthChecks(this IEndpointRouteBuilder endpoints, string serviceName)
        {
            endpoints.MapGet("/health", () => Results.Ok(new { status = "healthy", service = serviceName }))
                     .AllowAnonymous();

            // Predicate false => run no checks at all; answers 200 as long as the
            // process can still serve a request. That is precisely the question.
            endpoints.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false })
                     .AllowAnonymous();

            endpoints.MapHealthChecks("/health/ready", new HealthCheckOptions
            {
                Predicate = registration => registration.Tags.Contains(ReadyTag),
                ResponseWriter = WriteDetails,
            }).AllowAnonymous();

            // Same checks as readiness, but consumed by startupProbe, which grants a
            // far larger failure budget while the process warms up.
            endpoints.MapHealthChecks("/health/startup", new HealthCheckOptions
            {
                Predicate = registration => registration.Tags.Contains(ReadyTag),
                ResponseWriter = WriteDetails,
            }).AllowAnonymous();

            return endpoints;
        }

        /// <summary>Per-check detail, so a failing probe names the dependency at fault.</summary>
        private static Task WriteDetails(HttpContext context, HealthReport report)
        {
            context.Response.ContentType = "application/json";

            return context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                status = report.Status.ToString(),
                checks = report.Entries.Select(entry => new
                {
                    name = entry.Key,
                    status = entry.Value.Status.ToString(),
                    error = entry.Value.Exception?.Message,
                }),
            }));
        }
    }
}
