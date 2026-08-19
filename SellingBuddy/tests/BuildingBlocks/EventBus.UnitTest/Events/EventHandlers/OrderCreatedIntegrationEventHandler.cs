using EventBus.Base.Abstraction;
using EventBus.UnitTest.Events.Events;
using System.Collections.Concurrent;

namespace EventBus.UnitTest.Events.EventHandlers
{
    public class OrderCreatedIntegrationEventHandler : IIntegrationEventHandler<OrderCreatedIntegrationEvent>
    {
        /// <summary>
        /// Lets a round-trip test wait for the message it published to come back.
        /// Register an id before publishing and await the task it maps to.
        /// </summary>
        public static readonly ConcurrentDictionary<int, TaskCompletionSource<OrderCreatedIntegrationEvent>> Awaited = new();

        public Task Handle(OrderCreatedIntegrationEvent @event)
        {
            Console.WriteLine("Handle method worked: with id:" + @event.Id);

            if (Awaited.TryGetValue(@event.Id, out var pending))
                pending.TrySetResult(@event);

            return Task.CompletedTask;
        }
    }
}
