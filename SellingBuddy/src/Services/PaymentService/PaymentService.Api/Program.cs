using EventBus.Base;
using EventBus.Base.Abstraction;
using EventBus.Factory;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PaymentService.Api.IntegrationEvents.EventHandlers;
using PaymentService.Api.IntegrationEvents.Events;
using RabbitMQ.Client;

var builder = WebApplication.CreateBuilder(args);

// 1. Controller'larý Ekle
builder.Services.AddControllers();

// 2. Swagger Altyapýsý
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 3. Logger Ayarý
builder.Services.AddLogging(configure => configure.AddConsole());

// 4. EventHandler'ýmýzý Sisteme Tanýtýyoruz (Transient = Her çaðrýldýðýnda yeni bir tane oluþturulur)
builder.Services.AddTransient<OrderStartedIntegrationEventHandler>();

// 5. EventBus'ý RabbitMQ Konfigürasyonu Ýle Singleton Olarak Ayaða Kaldýrýyoruz
builder.Services.AddSingleton<IEventBus>(sp =>
{
    EventBusConfig config = new()
    {
        ConnectionRetryCount = 5,
        EventNameSuffix = "IntegrationEvent",
        SubscriberClientAppName = "PaymentService",
        EventBusType = EventBusType.RabbitMQ,
        Connection = new ConnectionFactory() // Varsayýlan olarak localhost'a baðlanýr
    };

    return EventBusFactory.Create(config, sp);
});

var app = builder.Build();

// 6. HTTP Request Pipeline (Middleware) Ayarlarý
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

var eventBus = app.Services.GetRequiredService<IEventBus>();
eventBus.Subscribe<OrderStartedIntegrationEvent, OrderStartedIntegrationEventHandler>();

app.Run();