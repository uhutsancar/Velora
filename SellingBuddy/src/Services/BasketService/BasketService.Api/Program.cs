using BasketService.Api.Extensions;
using EventBus.Base;
using EventBus.Base.Abstraction;
using EventBus.Factory;
using BasketService.Api.Core.Application.Repository;
using BasketService.Api.Infrastructure.Repository;
using BasketService.Api.Core.Application.Services;
using BasketService.Api.IntegrationEvents.Events;
using BasketService.Api.IntegrationEvents.EventHandlers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 1. BÜTÜN AUTH ÝÞLEMLERÝ BURADA (Tek satýrda çaðýrýyoruz)
builder.Services.ConfigureAuth(builder.Configuration);

// 2. DÝÐER SERVÝS KAYITLARI
builder.Services.ConfigureConsul(builder.Configuration);
builder.Services.AddSingleton(sp => sp.ConfigureRedis(builder.Configuration));
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IBasketRepository, RedisBasketRepository>();
builder.Services.AddTransient<IIdentityService, IdentityService>();
builder.Services.AddTransient<OrderCreatedIntegrationEventHandler>();

builder.Services.AddSingleton<IEventBus>(sp =>
{
    var config = new EventBusConfig()
    {
        ConnectionRetryCount = 5,
        EventNameSuffix = "IntegrationEvent",
        SubscriberClientAppName = "BasketService",
        EventBusType = EventBusType.RabbitMQ
    };
    return EventBusFactory.Create(config, sp);
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseRouting();

// Debug Middleware 1: Ýsteði Yakala 
app.Use(async (context, next) =>
{
    var authHeader = context.Request.Headers["Authorization"].ToString();
    Console.WriteLine($"\n[DEBUG] Ýstek URL: {context.Request.Path}");
    if (!string.IsNullOrEmpty(authHeader))
        Console.WriteLine($"[DEBUG] Token Baþlangýcý: {authHeader.Substring(0, Math.Min(authHeader.Length, 20))}...");
    else
        Console.WriteLine("[DEBUG] !!! AUTH HEADER BOÞ !!!");
    await next();
});

// Debug Middleware 2: Sonuç 401 ise Yakala 
app.Use(async (context, next) =>
{
    await next();
    if (context.Response.StatusCode == 401)
    {
        Console.WriteLine(">>> 401 ALINDI! ÝSTEK DETAYI:");
        foreach (var header in context.Request.Headers)
            Console.WriteLine($"{header.Key}: {header.Value}");
    }
});

// MÝDDLEWARE HATTI 
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.RegisterWithConsul(app.Lifetime);

var eventBus = app.Services.GetRequiredService<IEventBus>();
eventBus.Subscribe<OrderCreatedIntegrationEvent, OrderCreatedIntegrationEventHandler>();

app.Run();