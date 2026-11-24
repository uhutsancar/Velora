using EventBus.Base.Events;

namespace OrderService.Application.Interfaces.Repositories;

public interface IIntegrationEventOutbox
{
    void Enqueue(IntegrationEvent integrationEvent);
}

public sealed class OutboxMessage
{
    public Guid Id { get; set; }
    public DateTime OccurredAtUtc { get; set; }
    public string EventType { get; set; } = default!;
    public string Payload { get; set; } = default!;
    public DateTime? ProcessedAtUtc { get; set; }
    public int Attempts { get; set; }
    public string? LastError { get; set; }
}
