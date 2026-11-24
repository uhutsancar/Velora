using CatalogService.Api.Core.Domain;
using CatalogService.Api.Infrastructure.Context;
using EventBus.Base.Abstraction;
using EventBus.Base.Events;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;

namespace CatalogService.Api.Infastructure;

public sealed class CatalogOutboxPublisher : BackgroundService
{
    private readonly IServiceScopeFactory scopes;
    private readonly ILogger<CatalogOutboxPublisher> logger;

    public CatalogOutboxPublisher(IServiceScopeFactory scopes, ILogger<CatalogOutboxPublisher> logger)
    {
        this.scopes = scopes;
        this.logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var published = await PublishBatch(stoppingToken);
            if (published == 0)
                await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
        }
    }

    private async Task<int> PublishBatch(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CatalogContext>();
        var eventBus = scope.ServiceProvider.GetRequiredService<IEventBus>();
        var messages = await db.OutboxMessages
            .Where(item => item.ProcessedAtUtc == null)
            .OrderBy(item => item.OccurredAtUtc)
            .Take(50)
            .ToListAsync(ct);

        foreach (var message in messages)
        {
            try
            {
                var type = Type.GetType(message.EventType, throwOnError: true)!;
                var integrationEvent = (IntegrationEvent?)JsonConvert.DeserializeObject(message.Payload, type)
                    ?? throw new InvalidOperationException("Outbox payload could not be deserialized.");
                eventBus.Publish(integrationEvent);
                message.ProcessedAtUtc = DateTime.UtcNow;
                message.LastError = null;
            }
            catch (Exception ex)
            {
                message.Attempts += 1;
                message.LastError = ex.Message.Length > 2000 ? ex.Message[..2000] : ex.Message;
                logger.LogWarning(ex, "Outbox message {MessageId} publish failed (attempt {Attempt}).", message.Id, message.Attempts);
                break;
            }
        }

        await db.SaveChangesAsync(ct);
        return messages.Count(item => item.ProcessedAtUtc is not null);
    }
}
