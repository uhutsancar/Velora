using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Velora.Shared.Observability;

public static class VeloraObservability
{
    public const string EventBusActivitySource = "Velora.EventBus";

    public static IServiceCollection AddVeloraObservability(
        this IServiceCollection services,
        IConfiguration configuration,
        string serviceName)
    {
        var otlpEndpoint = configuration["OTEL_EXPORTER_OTLP_ENDPOINT"];
        var resource = ResourceBuilder.CreateDefault().AddService(serviceName: serviceName);

        services.AddOpenTelemetry()
            .ConfigureResource(builder => builder.AddService(serviceName))
            .WithTracing(builder =>
            {
                builder
                    .SetResourceBuilder(resource)
                    .AddSource(EventBusActivitySource)
                    .AddAspNetCoreInstrumentation(options =>
                        options.Filter = context => !context.Request.Path.StartsWithSegments("/health"))
                    .AddHttpClientInstrumentation();

                if (Uri.TryCreate(otlpEndpoint, UriKind.Absolute, out var endpoint))
                    builder.AddOtlpExporter(options => options.Endpoint = endpoint);
            })
            .WithMetrics(builder =>
            {
                builder
                    .SetResourceBuilder(resource)
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddRuntimeInstrumentation();

                if (Uri.TryCreate(otlpEndpoint, UriKind.Absolute, out var endpoint))
                    builder.AddOtlpExporter(options => options.Endpoint = endpoint);
            });

        return services;
    }
}
