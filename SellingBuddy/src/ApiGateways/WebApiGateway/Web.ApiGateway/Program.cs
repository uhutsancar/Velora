using System.Text.Json;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using Ocelot.Provider.Consul;
using Velora.Shared.Web;

var builder = WebApplication.CreateBuilder(args);

// Route table. reloadOnChange lets routes be edited without a restart in development.
// Environment variables are re-added afterwards so they still win: the JSON file would
// otherwise shadow overrides such as
// GlobalConfiguration__ServiceDiscoveryProvider__Host, which is how the gateway finds
// Consul when it runs in a container rather than on the developer machine.
builder.Configuration
    .AddJsonFile("Configurations/ocelot.json", optional: false, reloadOnChange: true)
    .AddEnvironmentVariables();

// The gateway is the single browser-facing origin, so CORS is enforced here.
builder.Services.ConfigureCors(builder.Configuration);

builder.Services.AddOcelot().AddConsul();

var app = builder.Build();

app.UseCors(CorsRegistration.PolicyName);

/*
 * Ocelot terminates the pipeline: anything the gateway serves itself has to be
 * a branch registered before UseOcelot. Endpoint routing (MapGet) never runs,
 * because Ocelot does not call the next middleware.
 */
app.Map("/health", branch =>
    branch.Run(async context =>
    {
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsync(
            JsonSerializer.Serialize(new { status = "healthy", service = "ApiGateway" }));
    }));

await app.UseOcelot();

app.Run();
