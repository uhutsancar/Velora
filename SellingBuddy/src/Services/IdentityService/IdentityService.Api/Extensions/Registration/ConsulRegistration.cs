//using Consul;
//using Microsoft.AspNetCore.Builder;
//using Microsoft.AspNetCore.Hosting.Server.Features;
//using Microsoft.AspNetCore.Http.Features;
//using Microsoft.Extensions.Configuration;
//using Microsoft.Extensions.DependencyInjection;
//using Microsoft.Extensions.Hosting;
//using Microsoft.Extensions.Logging;
//using System;
//using System.Linq;
//namespace IdentityService.Api.Extensions.Registration
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
//            var logger = app.ApplicationServices.GetRequiredService<ILoggerFactory>().CreateLogger("ConsulRegistration");
//            // Sunucunun ayağa kalktığından emin oluyoruz, böylece First() patlamaz.
//            lifetime.ApplicationStarted.Register(() =>
//            {
//                var features = app.Properties["server.Features"] as FeatureCollection;
//                var addresses = features.Get<IServerAddressesFeature>();
//                // Güvenli kontrol: adres listesi boş değilse al
//                if (addresses != null && addresses.Addresses.Any())
//                {
//                    var address = addresses.Addresses.First();
//                    var uri = new Uri(address);
//                    var registration = new AgentServiceRegistration()
//                    {
//                        ID = "IdentityService",
//                        Name = "IdentityService",
//                        Address = "localhost",
//                        Port = uri.Port,
//                        Tags = new[] { "Identity Service", "Identity", "Token", "JWT" }
//                    };
//                    logger.LogInformation("Registering IdentityService with Consul");
//                    consulClient.Agent.ServiceDeregister(registration.ID).Wait();
//                    consulClient.Agent.ServiceRegister(registration).Wait();
//                }
//            });
//            lifetime.ApplicationStopping.Register(() => {
//                logger.LogInformation("Deregistering IdentityService from Consul");
//                consulClient.Agent.ServiceDeregister("IdentityService").Wait();
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

namespace IdentityService.Api.Extensions.Registration
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
                        ID = "IdentityService",
                        Name = "IdentityService",
                        Address = "localhost",
                        Port = uri.Port,
                        Tags = new[] { "Identity Service", "Identity", "Token", "JWT" }
                    };

                    logger.LogInformation("Registering IdentityService with Consul");
                    consulClient.Agent.ServiceDeregister(registration.ID).Wait();
                    consulClient.Agent.ServiceRegister(registration).Wait();
                }
            });

            lifetime.ApplicationStopping.Register(() => {
                logger.LogInformation("Deregistering IdentityService from Consul");
                consulClient.Agent.ServiceDeregister("IdentityService").Wait();
            });
            return app;
        }
    }
}