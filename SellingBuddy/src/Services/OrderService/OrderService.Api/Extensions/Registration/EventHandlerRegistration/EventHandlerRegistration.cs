using OrderService.Api.IntegrationEvents.EventHandlers;

namespace OrderService.Api.Extensions.Registration
{
    public static class EventHandlerRegistration
    {
        /// <summary>
        /// Integration event handlers are resolved from the scope the event bus creates,
        /// so they must be registered as scoped or transient.
        /// </summary>
        public static IServiceCollection ConfigureEventHandlers(this IServiceCollection services)
        {
            services.AddTransient<OrderCreatedIntegrationEventHandler>();
            services.AddTransient<OrderPaymentSuccessIntegrationEventHandler>();
            services.AddTransient<OrderPaymentFailedIntegrationEventHandler>();

            return services;
        }
    }
}
