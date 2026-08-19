using EventBus.Base;
using EventBus.Base.Abstraction;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RabbitMQ.Client;

namespace EventBus.Factory
{
    /// <summary>
    /// Builds the event bus from configuration so the broker host and credentials are
    /// environment-specific instead of compiled in. Every Velora service registers the
    /// bus through this one entry point, which keeps topic name and event-name
    /// conventions identical across services - they have to match or the routing keys
    /// stop lining up.
    ///
    /// Configuration section (all keys optional except in production):
    ///   EventBus:Type              RabbitMQ (default) | AzureServiceBus
    ///   EventBus:TopicName         exchange/topic name, default SellingBuddyEventBus
    ///   EventBus:RetryCount        connection retry attempts, default 5
    ///   EventBus:HostName          RabbitMQ host, default localhost
    ///   EventBus:Port              RabbitMQ port, default 5672
    ///   EventBus:UserName          RabbitMQ user, default guest
    ///   EventBus:Password          RabbitMQ password, default guest
    ///   EventBus:VirtualHost       RabbitMQ vhost, default /
    ///   EventBus:ConnectionString  Azure Service Bus connection string
    /// </summary>
    public static class VeloraEventBusRegistration
    {
        public const string SectionName = "EventBus";

        public static IServiceCollection AddVeloraEventBus(
            this IServiceCollection services,
            IConfiguration configuration,
            string subscriberClientAppName)
        {
            services.AddSingleton<IEventBus>(sp =>
                EventBusFactory.Create(BuildConfig(configuration, subscriberClientAppName), sp));

            return services;
        }

        public static EventBusConfig BuildConfig(IConfiguration configuration, string subscriberClientAppName)
        {
            var section = configuration.GetSection(SectionName);

            var busType = string.Equals(section["Type"], nameof(EventBusType.AzureServiceBus), StringComparison.OrdinalIgnoreCase)
                ? EventBusType.AzureServiceBus
                : EventBusType.RabbitMQ;

            var config = new EventBusConfig
            {
                ConnectionRetryCount = int.TryParse(section["RetryCount"], out var retry) && retry > 0 ? retry : 5,
                DefaultTopicName = Fallback(section["TopicName"], "SellingBuddyEventBus"),
                EventNameSuffix = "IntegrationEvent",
                SubscriberClientAppName = subscriberClientAppName,
                EventBusType = busType
            };

            if (busType == EventBusType.AzureServiceBus)
            {
                config.EventBusConnectionString = section["ConnectionString"]
                    ?? throw new InvalidOperationException(
                        "EventBus:Type is AzureServiceBus but EventBus:ConnectionString is not set. " +
                        "Provide it as the environment variable EventBus__ConnectionString.");

                return config;
            }

            var factory = new ConnectionFactory
            {
                HostName = Fallback(section["HostName"], "localhost"),
                UserName = Fallback(section["UserName"], "guest"),
                Password = Fallback(section["Password"], "guest"),
                VirtualHost = Fallback(section["VirtualHost"], "/"),
                DispatchConsumersAsync = false
            };

            if (int.TryParse(section["Port"], out var port) && port > 0)
                factory.Port = port;

            config.Connection = factory;

            return config;
        }

        private static string Fallback(string? value, string fallback) =>
            string.IsNullOrWhiteSpace(value) ? fallback : value;
    }
}
