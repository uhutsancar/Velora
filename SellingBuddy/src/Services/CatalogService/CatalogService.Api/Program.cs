using CatalogService.Api.Extensions;
using CatalogService.Api.Infrastructure.Context;
using CatalogService.Api.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using CatalogService.Api.Infastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();


builder.Services.Configure<CatalogSettings>(builder.Configuration.GetSection("CatalogSettings"));


builder.Services.ConfigureDbContext(builder.Configuration);


builder.Services.ConfigureConsul(builder.Configuration);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.MigrateDbContext<CatalogContext>((context, services) =>
{
    var env = services.GetRequiredService<IWebHostEnvironment>();
    var logger = services.GetRequiredService<ILogger<CatalogContextSeed>>();
    new CatalogContextSeed().SeedAsync(context, env, logger).Wait();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.RegisterWithConsul(app.Lifetime);

app.Run();