using Consul;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Velora.Shared.Discovery
{
    /// <summary>
    /// Consul registration shared by every Velora service, so discovery behaves
    /// identically everywhere instead of drifting across four near-identical copies.
    ///
    /// Configuration (section "ConsulConfig"):
    ///   Address          - Consul agent URL, e.g. http://localhost:8500
    ///   ServiceHost      - address other services use to reach this one (default "localhost")
    ///   HealthCheckHost  - address the *Consul agent* uses to reach this service.
    ///                      When Consul runs in Docker, "localhost" is the container
    ///                      itself, so this defaults to "host.docker.internal".
    /// </summary>
    public static class VeloraConsulRegistration
    {
        private const string DefaultServiceHost = "localhost";
        private const string DefaultHealthCheckHost = "host.docker.internal";

        public static IServiceCollection AddVeloraConsul(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddSingleton<IConsulClient, ConsulClient>(_ => new ConsulClient(consulConfig =>
            {
                var address = configuration["ConsulConfig:Address"]
                              ?? throw new InvalidOperationException("ConsulConfig:Address is not configured.");

                consulConfig.Address = new Uri(address);
            }));

            return services;
        }

        public static IApplicationBuilder UseVeloraConsul(
            this IApplicationBuilder app,
            IHostApplicationLifetime lifetime,
            string serviceName,
            params string[] tags)
        {
            var consulClient = app.ApplicationServices.GetRequiredService<IConsulClient>();
            var configuration = app.ApplicationServices.GetRequiredService<IConfiguration>();
            var logger = app.ApplicationServices.GetRequiredService<ILoggerFactory>().CreateLogger("ConsulRegistration");

            var serviceHost = configuration["ConsulConfig:ServiceHost"] ?? DefaultServiceHost;
            var healthCheckHost = configuration["ConsulConfig:HealthCheckHost"] ?? DefaultHealthCheckHost;

            lifetime.ApplicationStarted.Register(() =>
            {
                if (app.Properties["server.Features"] is not FeatureCollection features) return;

                var addresses = features.Get<IServerAddressesFeature>();
                if (addresses is null || addresses.Addresses.Count == 0)
                {
                    logger.LogWarning("{ServiceName}: no server address available, skipping Consul registration.", serviceName);
                    return;
                }

                var port = new Uri(addresses.Addresses.First()).Port;

                var registration = new AgentServiceRegistration
                {
                    ID = serviceName,
                    Name = serviceName,
                    Address = serviceHost,
                    Port = port,
                    Tags = tags,
                    Check = new AgentServiceCheck
                    {
                        HTTP = $"http://{healthCheckHost}:{port}/health",
                        Interval = TimeSpan.FromSeconds(15),
                        Timeout = TimeSpan.FromSeconds(5),
                        // Without this an unhealthy instance would linger in the catalogue forever.
                        DeregisterCriticalServiceAfter = TimeSpan.FromMinutes(1)
                    }
                };

                try
                {
                    consulClient.Agent.ServiceDeregister(registration.ID).GetAwaiter().GetResult();
                    consulClient.Agent.ServiceRegister(registration).GetAwaiter().GetResult();

                    logger.LogInformation(
                        "Registered {ServiceName} with Consul at {Host}:{Port} (health via {HealthHost}).",
                        serviceName, serviceHost, port, healthCheckHost);
                }
                catch (Exception ex)
                {
                    // A discovery outage must not take the service down; the gateway
                    // will simply not route to it until registration succeeds.
                    logger.LogError(ex, "Consul registration failed for {ServiceName}.", serviceName);
                }
            });

            lifetime.ApplicationStopping.Register(() =>
            {
                try
                {
                    consulClient.Agent.ServiceDeregister(serviceName).GetAwaiter().GetResult();
                    logger.LogInformation("Deregistered {ServiceName} from Consul.", serviceName);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Consul deregistration failed for {ServiceName}.", serviceName);
                }
            });

            return app;
        }
    }
}
