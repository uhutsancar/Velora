using System.Text.Json;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using Ocelot.Provider.Consul;
using Velora.Shared.Discovery;
using Velora.Shared.Web;

var builder = WebApplication.CreateBuilder(args);

// Route table. reloadOnChange lets routes be edited without a restart in development.
// Environment variables are re-added afterwards so they still win: the JSON file would
// otherwise shadow overrides such as
// GlobalConfiguration__ServiceDiscoveryProvider__Host, which is how the gateway finds
// Consul when it runs in a container rather than on the developer machine.
//
// Two route tables ship in the image and Ocelot__ConfigFile picks one:
//   ocelot.json      (default) Consul discovery - local and docker-compose
//   ocelot.k8s.json            kube-dns         - Kubernetes
// The k8s variant is generated from the first by scripts/generate-ocelot-k8s.py,
// so routes are only ever authored once.
var routeFile = builder.Configuration["Ocelot:ConfigFile"] ?? "Configurations/ocelot.json";

builder.Configuration
    .AddJsonFile(routeFile, optional: false, reloadOnChange: true)
    .AddEnvironmentVariables();

// The gateway is the single browser-facing origin, so CORS is enforced here.
builder.Services.ConfigureCors(builder.Configuration);

// AddConsul() registers a discovery provider that expects a reachable agent.
// In Kubernetes there is none, and the routes carry explicit hosts instead.
var ocelot = builder.Services.AddOcelot();

if (VeloraConsulRegistration.IsEnabled(builder.Configuration))
{
    ocelot.AddConsul();
}

var app = builder.Build();

app.UseCors(CorsRegistration.PolicyName);

/*
 * Ocelot terminates the pipeline: anything the gateway serves itself has to be
 * a branch registered before UseOcelot. Endpoint routing (MapGet) never runs,
 * because Ocelot does not call the next middleware.
 */
static void MapProbe(WebApplication application, string path, object payload) =>
    application.Map(path, branch =>
        branch.Run(async context =>
        {
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
        }));

// Legacy endpoint - docker-compose, the Consul check and verify-stack.py read it,
// so its payload stays exactly as it was.
MapProbe(app, "/health", new { status = "healthy", service = "ApiGateway" });

// The gateway owns no database, cache or queue: it only forwards. So liveness and
// readiness ask the same question, "is this process still answering?", and neither
// depends on a downstream service. Tying gateway readiness to the backends would
// remove the one component able to return a clean 503 for a single broken route.
MapProbe(app, "/health/live", new { status = "Healthy" });
MapProbe(app, "/health/ready", new { status = "Healthy" });
MapProbe(app, "/health/startup", new { status = "Healthy" });

await app.UseOcelot();

app.Run();
