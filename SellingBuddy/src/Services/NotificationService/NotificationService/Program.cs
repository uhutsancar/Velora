using EventBus.Base.Abstraction;
using EventBus.Factory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Velora.Shared.Health;
using NotificationService.IntegrationEvents.EventHandlers;
using NotificationService.IntegrationEvents.Events;

// A web host rather than a plain console host, purely so the process can answer
// health probes. Without an HTTP surface Kubernetes has no way to tell a wedged
// consumer from a healthy one: the pod stays Running while no message is ever
// handled again. The service still does all its work over RabbitMQ; HTTP only
// carries /health*.
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddLogging(logging => logging.AddConsole());

builder.Services.AddTransient<OrderPaymentFailedIntegrationEventHandler>();
builder.Services.AddTransient<OrderPaymentSuccessIntegrationEventHandler>();
builder.Services.AddTransient<OrderStatusChangedIntegrationEventHandler>();
builder.Services.AddTransient<OrderPaidIntegrationEventHandler>();
builder.Services.AddTransient<ProductStockChangedIntegrationEventHandler>();

builder.Services.AddVeloraEventBus(builder.Configuration, "NotificationService");
builder.Services.AddVeloraHealthChecks(builder.Configuration);

var host = builder.Build();

host.MapVeloraHealthChecks("NotificationService");

var eventBus = host.Services.GetRequiredService<IEventBus>();

eventBus.Subscribe<OrderPaymentFailedIntegrationEvent, OrderPaymentFailedIntegrationEventHandler>();
eventBus.Subscribe<OrderPaymentSuccessIntegrationEvent, OrderPaymentSuccessIntegrationEventHandler>();
eventBus.Subscribe<OrderStatusChangedIntegrationEvent, OrderStatusChangedIntegrationEventHandler>();
eventBus.Subscribe<OrderPaidIntegrationEvent, OrderPaidIntegrationEventHandler>();
eventBus.Subscribe<ProductStockChangedIntegrationEvent, ProductStockChangedIntegrationEventHandler>();

Console.WriteLine("Velora NotificationService is listening on RabbitMQ...");

host.Run();
