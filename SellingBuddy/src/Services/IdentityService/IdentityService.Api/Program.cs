using Velora.Shared.Health;
using IdentityService.Api.Application.Services;
using IdentityService.Api.Extensions;
using IdentityService.Api.Extensions.Registration;
using IdentityService.Api.Infrastructure.Context;
using Microsoft.OpenApi.Models;
using Velora.Shared.Middleware;
using Velora.Shared.Web;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Velora Identity API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste the access token (without the Bearer prefix)."
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

builder.Services.ConfigureDbContext(builder.Configuration, builder.Environment);
builder.Services.ConfigureAuth(builder.Configuration, builder.Environment);
builder.Services.ConfigureRateLimiting(builder.Configuration);
builder.Services.ConfigureConsul(builder.Configuration);
builder.Services.ConfigureCors(builder.Configuration);

builder.Services.AddScoped<IIdentityService, IdentityService.Api.Application.Services.IdentityService>();
builder.Services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
builder.Services.AddSingleton<ITokenService, TokenService>();

builder.Services.AddVeloraHealthChecks(builder.Configuration, builder.Configuration.GetConnectionString("IdentityConnection"));

var app = builder.Build();

app.UseVeloraExceptionHandling();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(CorsRegistration.PolicyName);
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapVeloraHealthChecks("IdentityService");

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
    app.MigrateDbContext<IdentityDbContext>((context, services) =>
    {
        var configuration = services.GetRequiredService<IConfiguration>();
        var hasher = services.GetRequiredService<IPasswordHasher>();
        var logger = services.GetRequiredService<ILogger<IdentityContextSeed>>();

        new IdentityContextSeed().SeedAsync(context, configuration, app.Environment, hasher, logger).GetAwaiter().GetResult();
    });
}

if (migrateOnly)
{
    return;
}

app.RegisterWithConsul(app.Lifetime);

app.Run();

/// <summary>Exposed so the integration test host can reference the entry point assembly.</summary>
public partial class Program;
