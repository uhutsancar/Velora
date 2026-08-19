using EventBus.Base.Abstraction;
using EventBus.Base.SubManagers;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;
using System;
using System.Threading.Tasks;

namespace EventBus.Base.Events
{
    public abstract class BaseEventBus : IEventBus
    {
        public readonly IServiceProvider ServiceProvider;
        public readonly IEventBusSubscriptionManager SubsManager;

        public EventBusConfig EventBusConfig { get; set; }

        protected BaseEventBus(EventBusConfig config, IServiceProvider serviceProvider)
        {
            EventBusConfig = config;
            ServiceProvider = serviceProvider;
            SubsManager = new InMemoryEventBusSubscriptionManager(ProcessEventName);
        }

        /// <summary>
        /// Strips the configured prefix/suffix from a CLR event type name so that the
        /// routing key stays stable across services (e.g. "OrderCreatedIntegrationEvent" -> "OrderCreated").
        /// </summary>
        public virtual string ProcessEventName(string eventName)
        {
            if (string.IsNullOrEmpty(eventName))
                return eventName;

            if (EventBusConfig.DeleteEventPrefix && eventName.StartsWith(EventBusConfig.EventNamePrefix, StringComparison.Ordinal))
                eventName = eventName.Substring(EventBusConfig.EventNamePrefix.Length);

            if (EventBusConfig.DeleteEventSuffix && eventName.EndsWith(EventBusConfig.EventNameSuffix, StringComparison.Ordinal))
                eventName = eventName.Substring(0, eventName.Length - EventBusConfig.EventNameSuffix.Length);

            return eventName;
        }

        public virtual string GetSubName(string eventName)
        {
            return $"{EventBusConfig.SubscriberClientAppName}.{ProcessEventName(eventName)}";
        }

        public virtual void Dispose()
        {
            EventBusConfig = null!;
            SubsManager.Clear();
            GC.SuppressFinalize(this);
        }

        /// <summary>
        /// Resolves every handler registered for the event and invokes it.
        /// Handlers are resolved from a dedicated DI scope so that scoped dependencies
        /// (DbContext, IMediator, repositories) can be injected safely.
        /// </summary>
        public async Task<bool> ProcessEvent(string eventName, string message)
        {
            eventName = ProcessEventName(eventName);
            var processed = false;

            if (!SubsManager.HasSubscriptionsForEvent(eventName))
                return processed;

            var eventType = SubsManager.GetEventTypeByName($"{EventBusConfig.EventNamePrefix}{eventName}{EventBusConfig.EventNameSuffix}");
            if (eventType == null)
                return processed;

            var subscriptions = SubsManager.GetHandlersForEvent(eventName);

            using var scope = ServiceProvider.CreateScope();

            foreach (var subscription in subscriptions)
            {
                // NOTE: resolve from the *scoped* provider, not the root one.
                var handler = scope.ServiceProvider.GetService(subscription.HandlerType);
                if (handler == null) continue;

                var integrationEvent = JsonConvert.DeserializeObject(message, eventType);

                var concreteType = typeof(IIntegrationEventHandler<>).MakeGenericType(eventType);
                var handleMethod = concreteType.GetMethod("Handle")
                                   ?? throw new InvalidOperationException($"Handle method not found on {concreteType.Name}");

                await (Task)handleMethod.Invoke(handler, new[] { integrationEvent })!;

                processed = true;
            }

            return processed;
        }

        public abstract void Publish(IntegrationEvent @event);

        public abstract void Subscribe<T, TH>()
            where T : IntegrationEvent
            where TH : IIntegrationEventHandler<T>;

        public abstract void UnSubscribe<T, TH>()
            where T : IntegrationEvent
            where TH : IIntegrationEventHandler<T>;
    }
}
