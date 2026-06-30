//using Microsoft.Extensions.DependencyInjection;
//using Microsoft.Extensions.Logging;
//using Microsoft.Extensions.Hosting;
//using System;
//using System.Collections.Generic;
//using System.Linq;
//using System.Threading.Tasks;
//using Consul;
//using Microsoft.AspNetCore.Builder;
//using Microsoft.AspNetCore.Http.Features;
//using Microsoft.AspNetCore.Hosting.Server.Features;
//using Microsoft.Extensions.Configuration;
//namespace CatalogService.Api.Extensions
//{
//    public static class ConsulRegistration
//    {
//        public static IServiceCollection ConfigureConsul(this IServiceCollection services, IConfiguration configuration)
//        {
//            services.AddSingleton<IConsulClient, ConsulClient>(p => new ConsulClient(consulConfig =>
//            {
//                var address = configuration["ConsulConfig:Address"];
//                consulConfig.Address = new Uri(address);
//            }));
//            return services;
//        }
//        public static IApplicationBuilder RegisterWithConsul(this IApplicationBuilder app, IHostApplicationLifetime lifetime)
//        {
//            var consulClient = app.ApplicationServices.GetRequiredService<IConsulClient>();
//            var loggingFactory = app.ApplicationServices.GetRequiredService<ILoggerFactory>();
//            var logger = loggingFactory.CreateLogger<IApplicationBuilder>();
//            // Sunucu tamamen ayağa kalktıktan sonra Consul'a kayıt oluyoruz
//            lifetime.ApplicationStarted.Register(() =>
//            {
//                var features = app.Properties["server.Features"] as FeatureCollection;
//                var addresses = features.Get<IServerAddressesFeature>();
//                if (addresses != null && addresses.Addresses.Any())
//                {
//                    var address = addresses.Addresses.First();
//                    var uri = new Uri(address);
//                    var registration = new AgentServiceRegistration()
//                    {
//                        ID = "CatalogService",
//                        Name = "CatalogService",
//                        Address = "localhost",
//                        Port = uri.Port,
//                        Tags = new[] { "Catalog Service", "Catalog" }
//                    };
//                    logger.LogInformation("Registering CatalogService with Consul");
//                    consulClient.Agent.ServiceDeregister(registration.ID).Wait();
//                    consulClient.Agent.ServiceRegister(registration).Wait();
//                }
//                else
//                {
//                    logger.LogWarning("CatalogService: Consul kaydı yapılamadı, sunucu adresi bulunamadı.");
//                }
//            });
//            lifetime.ApplicationStopping.Register(() =>
//            {
//                logger.LogInformation("Deregistering CatalogService from Consul");
//                consulClient.Agent.ServiceDeregister("CatalogService").Wait();
//            });
//            return app;
//        }
//    }
//}















using Consul;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;

namespace CatalogService.Api.Extensions
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
            var logger = app.ApplicationServices.GetRequiredService<ILoggerFactory>().CreateLogger("ConsulRegistration");

            lifetime.ApplicationStarted.Register(() =>
            {
                var features = app.Properties["server.Features"] as FeatureCollection;
                var addresses = features.Get<IServerAddressesFeature>();

                if (addresses != null && addresses.Addresses.Any())
                {
                    var address = addresses.Addresses.First();
                    var uri = new Uri(address);

                    var registration = new AgentServiceRegistration()
                    {
                        ID = "CatalogService",
                        Name = "CatalogService",
                        // KONTEYNER ADI YERİNE LOCALHOST KULLANIYORUZ
                        Address = "localhost",
                        Port = uri.Port,
                        Tags = new[] { "Catalog Service", "Catalog" }
                    };

                    logger.LogInformation("Registering CatalogService with Consul");
                    consulClient.Agent.ServiceDeregister(registration.ID).Wait();
                    consulClient.Agent.ServiceRegister(registration).Wait();
                }
            });

            lifetime.ApplicationStopping.Register(() =>
            {
                logger.LogInformation("Deregistering CatalogService from Consul");
                consulClient.Agent.ServiceDeregister("CatalogService").Wait();
            });
            return app;
        }
    }
}