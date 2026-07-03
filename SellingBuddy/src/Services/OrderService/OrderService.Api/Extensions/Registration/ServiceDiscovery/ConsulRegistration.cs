using Consul;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;

namespace BasketService.Api.Extensions
{
    public static class ConsulRegistration
    {
        public static IServiceCollection ConfigureConsul(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddSingleton<IConsulClient, ConsulClient>(p => new ConsulClient(consulConfig =>
            {
                var address = configuration["ConsulConfig:Address"];
                consulConfig.Address = new Uri(address);
            }));

            return services;
        }

        public static IApplicationBuilder RegisterWithConsul(this IApplicationBuilder app, IHostApplicationLifetime lifetime)
        {
            var consulClient = app.ApplicationServices.GetRequiredService<IConsulClient>();
            var loggingFactory = app.ApplicationServices.GetRequiredService<ILoggerFactory>();
            var logger = loggingFactory.CreateLogger<IApplicationBuilder>();

            lifetime.ApplicationStarted.Register(() =>
            {

                var features = app.Properties["server.Features"] as FeatureCollection;
                var addresses = features?.Get<IServerAddressesFeature>();


                var address = addresses?.Addresses.FirstOrDefault();


                if (string.IsNullOrEmpty(address))
                {
                    logger.LogWarning("Consul kaydi icin gecerli bir sunucu adresi bulunamadi.");
                    return;
                }


                var uri = new Uri(address);
                var registration = new AgentServiceRegistration()
                {
                    ID = $"OrderService",
                    Name = "OrderService",
                    Address = $"{uri.Host}",
                    Port = uri.Port,
                    Tags = new[] { "Ordering Service", "Order" }
                };

                logger.LogInformation("Registering with Consul at {Address}", address);

                consulClient.Agent.ServiceDeregister(registration.ID).Wait();
                consulClient.Agent.ServiceRegister(registration).Wait();


                lifetime.ApplicationStopping.Register(() =>
                {
                    logger.LogInformation("Deregistering from Consul");
                    consulClient.Agent.ServiceDeregister(registration.ID).Wait();
                });
            });

            return app;
        }
    }
}