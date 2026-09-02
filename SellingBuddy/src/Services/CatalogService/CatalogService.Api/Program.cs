using Velora.Shared.Health;
using CatalogService.Api.Core.Application.Services;
using CatalogService.Api.Extensions;
using CatalogService.Api.Infastructure;
using CatalogService.Api.Infrastructure.Context;
using CatalogService.Api.Infrastructure.Services;
using CatalogService.Api.IntegrationEvents.EventHandlers;
using CatalogService.Api.IntegrationEvents.Events;
using EventBus.Base.Abstraction;
using EventBus.Factory;
using Microsoft.OpenApi.Models;
using Velora.Shared.Middleware;
using Velora.Shared.Security;
using Velora.Shared.Web;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Velora Catalog API", Version = "v1" });
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

builder.Services.Configure<CatalogSettings>(builder.Configuration.GetSection("CatalogSettings"));

builder.Services.ConfigureDbContext(builder.Configuration, builder.Environment);
builder.Services.ConfigureConsul(builder.Configuration);
builder.Services.ConfigureCors(builder.Configuration);
builder.Services.AddVeloraJwtAuth(builder.Configuration, builder.Environment);

builder.Services.AddScoped<IProductQueryService, ProductQueryService>();
builder.Services.AddScoped<IProductAdminService, ProductAdminService>();

// Event handlers must be resolvable from the DI scope the event bus creates.
builder.Services.AddTransient<OrderCreatedIntegrationEventHandler>();
builder.Services.AddTransient<OrderPaidIntegrationEventHandler>();

builder.Services.AddVeloraEventBus(builder.Configuration, "CatalogService");
builder.Services.AddResponseCaching();

builder.Services.AddVeloraHealthChecks(builder.Configuration, builder.Configuration.GetConnectionString("CatalogConnection"));

var app = builder.Build();

app.UseVeloraExceptionHandling();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Uploaded product images are served from wwwroot/media.
app.UseStaticFiles();

app.UseCors(CorsRegistration.PolicyName);
app.UseResponseCaching();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapVeloraHealthChecks("CatalogService");

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
    app.MigrateDbContext<CatalogContext>((context, services) =>
    {
        var env = services.GetRequiredService<IWebHostEnvironment>();
        var logger = services.GetRequiredService<ILogger<CatalogContextSeed>>();

        new CatalogContextSeed().SeedAsync(context, env, logger).GetAwaiter().GetResult();
    });
}

if (migrateOnly)
{
    return;
}

app.RegisterWithConsul(app.Lifetime);

var eventBus = app.Services.GetRequiredService<IEventBus>();

// Inventory is adjusted when a checkout is accepted by BasketService...
eventBus.Subscribe<OrderCreatedIntegrationEvent, OrderCreatedIntegrationEventHandler>();

// ...and the coupon is redeemed only once the payment actually succeeds.
eventBus.Subscribe<OrderPaidIntegrationEvent, OrderPaidIntegrationEventHandler>();

app.Run();

public partial class Program;
