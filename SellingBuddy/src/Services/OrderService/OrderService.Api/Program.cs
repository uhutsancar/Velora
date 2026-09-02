using Velora.Shared.Health;
using EventBus.Base.Abstraction;
using EventBus.Factory;
using Microsoft.OpenApi.Models;
using OrderService.Api.Extensions;
using OrderService.Api.Extensions.Registration;
using OrderService.Api.IntegrationEvents.EventHandlers;
using OrderService.Api.IntegrationEvents.Events;
using OrderService.Application;
using OrderService.Application.Features.Commands.CreateOrder;
using OrderService.Infrastructure;
using OrderService.Infrastructure.Context;
using Velora.Shared.Middleware;
using Velora.Shared.Security;
using Velora.Shared.Web;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Velora Order API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

builder.Logging.AddConsole();

builder.Services.AddApplicationRegistration(typeof(Program));
builder.Services.AddPersistenceRegistration(builder.Configuration, builder.Environment);

builder.Services.AddVeloraJwtAuth(builder.Configuration, builder.Environment);
builder.Services.ConfigureCors(builder.Configuration);
builder.Services.ConfigureEventHandlers();
builder.Services.ConfigureConsul(builder.Configuration);

builder.Services.AddVeloraEventBus(builder.Configuration, "OrderService");
// One registration covering the API assembly and the Application assembly;
// AddApplicationRegistration already wires the Application handlers, this adds the API ones.
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    cfg.RegisterServicesFromAssembly(typeof(CreateOrderCommand).Assembly);
});

builder.Services.AddVeloraHealthChecks(builder.Configuration, builder.Configuration["OrderDbConnectionString"]);

var app = builder.Build();

app.UseVeloraExceptionHandling();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(CorsRegistration.PolicyName);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapVeloraHealthChecks("OrderService");

// Migration/seed on boot is a convenience for local development only.
// In Kubernetes this is switched off (Database__MigrateOnStartup=false) and the
// schema is applied once by a pre-upgrade Job: N replicas starting together
// would otherwise race on __EFMigrationsHistory, and pod readiness would be
// gated on how long the migration takes.
//
// --migrate-only is what that Job runs: apply the schema, then exit. Without the
// exit the container would go on to serve HTTP and the Job would never complete.
var migrateOnly = args.Contains("--migrate-only");

if (migrateOnly || builder.Configuration.GetValue("Database:MigrateOnStartup", true))
{
    app.MigrateDbContext<OrderDbContext>((context, services) =>
    {
        var logger = services.GetRequiredService<ILogger<OrderDbContext>>();

        new OrderDbContextSeed().SeedAsync(context, logger).GetAwaiter().GetResult();
    });
}

if (migrateOnly)
{
    return;
}

app.RegisterWithConsul(app.Lifetime);

var eventBus = app.Services.GetRequiredService<IEventBus>();

// Checkout accepted -> create the order aggregate.
eventBus.Subscribe<OrderCreatedIntegrationEvent, OrderCreatedIntegrationEventHandler>();

// Payment result -> close the saga by moving the order to Paid or Cancelled.
eventBus.Subscribe<OrderPaymentSuccessIntegrationEvent, OrderPaymentSuccessIntegrationEventHandler>();
eventBus.Subscribe<OrderPaymentFailedIntegrationEvent, OrderPaymentFailedIntegrationEventHandler>();

app.Run();

public partial class Program;
