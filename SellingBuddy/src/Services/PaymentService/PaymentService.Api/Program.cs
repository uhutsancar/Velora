using Velora.Shared.Health;
using EventBus.Base.Abstraction;
using EventBus.Factory;
using PaymentService.Api.IntegrationEvents.EventHandlers;
using PaymentService.Api.IntegrationEvents.Events;
using Velora.Shared.Middleware;
using Velora.Shared.Observability;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddVeloraProblemDetails();
builder.Services.AddVeloraObservability(builder.Configuration, "PaymentService");
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddLogging(configure => configure.AddConsole());

// Resolved from the DI scope the event bus creates for each message.
builder.Services.AddTransient<OrderStartedIntegrationEventHandler>();

builder.Services.AddVeloraEventBus(builder.Configuration, "PaymentService");
builder.Services.AddVeloraHealthChecks(builder.Configuration);

var app = builder.Build();

app.UseVeloraExceptionHandling();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();
app.MapVeloraHealthChecks("PaymentService");

var eventBus = app.Services.GetRequiredService<IEventBus>();
eventBus.Subscribe<OrderStartedIntegrationEvent, OrderStartedIntegrationEventHandler>();

app.Run();
