using EventBus.Base.Abstraction;
using EventBus.Factory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NotificationService.IntegrationEvents.EventHandlers;
using NotificationService.IntegrationEvents.Events;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddLogging(logging => logging.AddConsole());

builder.Services.AddTransient<OrderPaymentFailedIntegrationEventHandler>();
builder.Services.AddTransient<OrderPaymentSuccessIntegrationEventHandler>();
builder.Services.AddTransient<OrderStatusChangedIntegrationEventHandler>();
builder.Services.AddTransient<OrderPaidIntegrationEventHandler>();
builder.Services.AddTransient<ProductStockChangedIntegrationEventHandler>();

builder.Services.AddVeloraEventBus(builder.Configuration, "NotificationService");
var host = builder.Build();

var eventBus = host.Services.GetRequiredService<IEventBus>();

eventBus.Subscribe<OrderPaymentFailedIntegrationEvent, OrderPaymentFailedIntegrationEventHandler>();
eventBus.Subscribe<OrderPaymentSuccessIntegrationEvent, OrderPaymentSuccessIntegrationEventHandler>();
eventBus.Subscribe<OrderStatusChangedIntegrationEvent, OrderStatusChangedIntegrationEventHandler>();
eventBus.Subscribe<OrderPaidIntegrationEvent, OrderPaidIntegrationEventHandler>();
eventBus.Subscribe<ProductStockChangedIntegrationEvent, ProductStockChangedIntegrationEventHandler>();

Console.WriteLine("Velora NotificationService is listening on RabbitMQ...");

host.Run();
