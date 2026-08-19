using EventBus.Base;
using EventBus.Base.Abstraction;
using EventBus.Factory;
using EventBus.UnitTest.Events.EventHandlers;
using EventBus.UnitTest.Events.Events;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;

namespace EventBus.UnitTest
{
    /// <summary>
    /// Broker smoke tests. These talk to a real broker, so they are inconclusive rather
    /// than failing when one is not reachable - that keeps a clean checkout green while
    /// still exercising the transport when infrastructure is up.
    ///
    /// Credentials are never stored in this file. Set them in the environment:
    ///   VELORA_RABBITMQ_HOST      default localhost
    ///   VELORA_RABBITMQ_PORT      default 5672
    ///   VELORA_RABBITMQ_USER      default guest
    ///   VELORA_RABBITMQ_PASSWORD  default guest
    ///   EventBus__ConnectionString  Azure Service Bus connection string (Azure tests skip without it)
    /// </summary>
    [TestClass]
    public sealed class EventBusTests
    {
        private const string TopicName = "SellingBuddyTopicName";

        private readonly ServiceCollection services;

        public EventBusTests()
        {
            services = new ServiceCollection();
            services.AddLogging(configure => configure.AddConsole());

            // The bus resolves handlers from DI, so an unregistered handler is silently skipped.
            services.AddTransient<OrderCreatedIntegrationEventHandler>();
        }

        [TestMethod]
        public void subscribe_event_on_rabbitmq_test()
        {
            var eventBus = CreateBus(GetRabbitMQConfig);

            eventBus.Subscribe<OrderCreatedIntegrationEvent, OrderCreatedIntegrationEventHandler>();
        }

        [TestMethod]
        public void send_message_to_rabbitmq_test()
        {
            var eventBus = CreateBus(GetRabbitMQConfig);

            eventBus.Publish(new OrderCreatedIntegrationEvent(1));
        }

        /// <summary>
        /// The only assertion that proves the transport end to end: publish a message
        /// with a unique id and wait for this process to receive that same id back.
        /// </summary>
        [TestMethod]
        public async Task round_trip_message_over_rabbitmq_test()
        {
            await RoundTrip(GetRabbitMQConfig);
        }

        [TestMethod]
        public async Task round_trip_message_over_azure_test()
        {
            await RoundTrip(GetAzureConfig);
        }

        private async Task RoundTrip(Func<EventBusConfig> configFactory)
        {
            var eventBus = CreateBus(configFactory);
            var id = Random.Shared.Next(100_000, 999_999);

            var received = new TaskCompletionSource<OrderCreatedIntegrationEvent>(
                TaskCreationOptions.RunContinuationsAsynchronously);
            OrderCreatedIntegrationEventHandler.Awaited[id] = received;

            try
            {
                eventBus.Subscribe<OrderCreatedIntegrationEvent, OrderCreatedIntegrationEventHandler>();

                // The subscriber has to be attached before the message is on the wire.
                await Task.Delay(1500);

                eventBus.Publish(new OrderCreatedIntegrationEvent(id));

                var completed = await Task.WhenAny(received.Task, Task.Delay(TimeSpan.FromSeconds(30)));

                Assert.AreSame(received.Task, completed, $"Message {id} was published but never came back within 30s.");
                Assert.AreEqual(id, received.Task.Result.Id);
            }
            finally
            {
                OrderCreatedIntegrationEventHandler.Awaited.TryRemove(id, out _);
            }
        }

        [TestMethod]
        public void subscribe_event_on_azure_test()
        {
            var eventBus = CreateBus(GetAzureConfig);

            eventBus.Subscribe<OrderCreatedIntegrationEvent, OrderCreatedIntegrationEventHandler>();

            Task.Delay(2000).Wait();
        }

        [TestMethod]
        public void send_message_to_azure_test()
        {
            var eventBus = CreateBus(GetAzureConfig);

            eventBus.Publish(new OrderCreatedIntegrationEvent(1));
        }

        private IEventBus CreateBus(Func<EventBusConfig> configFactory)
        {
            EventBusConfig config;

            try
            {
                config = configFactory();
            }
            catch (InvalidOperationException ex)
            {
                Assert.Inconclusive(ex.Message);
                throw;
            }

            services.AddSingleton<IEventBus>(sp => EventBusFactory.Create(config, sp));

            try
            {
                return services.BuildServiceProvider().GetRequiredService<IEventBus>();
            }
            catch (Exception ex)
            {
                Assert.Inconclusive($"Broker is not reachable, skipping: {ex.Message}");
                throw;
            }
        }

        private static EventBusConfig GetAzureConfig()
        {
            var connectionString = Environment.GetEnvironmentVariable("EventBus__ConnectionString");

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException(
                    "EventBus__ConnectionString is not set, skipping the Azure Service Bus test.");
            }

            return new EventBusConfig
            {
                ConnectionRetryCount = 5,
                SubscriberClientAppName = "EventBus.UnitTest",
                DefaultTopicName = TopicName,
                EventBusType = EventBusType.AzureServiceBus,
                EventNameSuffix = "IntegrationEvent",
                EventBusConnectionString = connectionString
            };
        }

        private static EventBusConfig GetRabbitMQConfig()
        {
            var factory = new ConnectionFactory
            {
                HostName = Environment.GetEnvironmentVariable("VELORA_RABBITMQ_HOST") ?? "localhost",
                UserName = Environment.GetEnvironmentVariable("VELORA_RABBITMQ_USER") ?? "guest",
                Password = Environment.GetEnvironmentVariable("VELORA_RABBITMQ_PASSWORD") ?? "guest"
            };

            if (int.TryParse(Environment.GetEnvironmentVariable("VELORA_RABBITMQ_PORT"), out var port) && port > 0)
                factory.Port = port;

            return new EventBusConfig
            {
                ConnectionRetryCount = 2,
                SubscriberClientAppName = "EventBus.UnitTest",
                DefaultTopicName = TopicName,
                EventBusType = EventBusType.RabbitMQ,
                EventNameSuffix = "IntegrationEvent",
                Connection = factory
            };
        }
    }
}
