using EventBus.Base;
using EventBus.Base.Abstraction;
using EventBus.Factory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using RabbitMQ.Client;
using NotificationService.IntegrationEvents.EventHandlers;
using PaymentService.Api.IntegrationEvents.Events;

var builder = Host.CreateApplicationBuilder(args);

// 1. İşleyicileri (Handlers) Sisteme Tanıt
builder.Services.AddTransient<OrderPaymentFailedIntegrationEventHandler>();
builder.Services.AddTransient<OrderPaymentSuccessIntegrationEventHandler>();

// 2. EventBus'ı Singleton olarak ekliyoruz
builder.Services.AddSingleton<IEventBus>(sp =>
{
    EventBusConfig config = new()
    {
        ConnectionRetryCount = 5,
        EventNameSuffix = "IntegrationEvent",
        SubscriberClientAppName = "NotificationService",
        EventBusType = EventBusType.RabbitMQ,
        Connection = new ConnectionFactory()
    };

    return EventBusFactory.Create(config, sp);
});

var host = builder.Build();

// 3. Subscription (Dinlemeye ve Tüketmeye Başla)
var eventBus = host.Services.GetRequiredService<IEventBus>();

eventBus.Subscribe<OrderPaymentFailedIntegrationEvent, OrderPaymentFailedIntegrationEventHandler>();
eventBus.Subscribe<OrderPaymentSuccessIntegrationEvent, OrderPaymentSuccessIntegrationEventHandler>();

// Sadece ekranda çalıştığını görmek için bir mesaj (Adamın Console.WriteLine kısmı)
Console.WriteLine("NotificationService is Running and Listening to RabbitMQ....");

host.Run();