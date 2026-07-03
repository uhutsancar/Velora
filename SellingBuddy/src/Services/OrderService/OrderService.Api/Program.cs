using OrderService.Api.Extensions.Registration;
using EventBus.Base.Abstraction;
using EventBus.Base;
using EventBus.Factory;
using OrderService.Api.IntegrationEvents.EventHandlers;
using OrderService.Api.IntegrationEvents.Events;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using BasketService.Api.Extensions;
using OrderService.Api.Extensions;
using OrderService.Infrastructure.Context;
using OrderService.Persistence.Context;
using OrderService.Application;
using OrderService.Persistence;
using OrderService.Application.Features.Commands.CreateOrder;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Logging.AddConsole();

builder.Services.AddApplicationRegistration(typeof(Program));
builder.Services.AddPersistenceRegistration(builder.Configuration);

builder.Services.ConfigureAuth(builder.Configuration);
builder.Services.ConfigureEventHandlers();
builder.Services.ConfigureConsul(builder.Configuration);

builder.Services.AddSingleton<IEventBus>(sp =>
{
    var config = new EventBusConfig()
    {
        ConnectionRetryCount = 5,
        EventNameSuffix = "IntegrationEvent",
        SubscriberClientAppName = "OrderService",
        EventBusType = EventBusType.RabbitMQ
    };
    return EventBusFactory.Create(config, sp);
});

builder.Services.AddMediatR(cfg => {
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    cfg.RegisterServicesFromAssembly(typeof(CreateOrderCommand).Assembly);
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.RegisterWithConsul(app.Lifetime);

var eventBus = app.Services.GetRequiredService<IEventBus>();
eventBus.Subscribe<OrderCreatedIntegrationEvent, OrderCreatedIntegrationEventHandler>();

app.MigrateDbContext<OrderDbContext>((context, services) =>
{
    var logger = services.GetRequiredService<ILogger<OrderDbContext>>();

    var dbContextSeeder = new OrderDbContextSeed();
    dbContextSeeder.SeedAsync(context, logger).Wait();
});

app.Run();