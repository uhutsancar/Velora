namespace CatalogService.Api.Core.Domain;

public enum StockReservationStatus
{
    Reserved = 1,
    Consumed = 2,
    Released = 3,
    Expired = 4
}

/// <summary>A durable, idempotent inventory hold for one order line.</summary>
public sealed class StockReservation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public Guid SourceEventId { get; set; }
    public int ProductId { get; set; }
    public int? VariantId { get; set; }
    public int Quantity { get; set; }
    public StockReservationStatus Status { get; set; } = StockReservationStatus.Reserved;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAtUtc { get; set; } = DateTime.UtcNow.AddMinutes(15);
    public DateTime? SettledAtUtc { get; set; }
}

public sealed class CouponRedemption
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public string UserId { get; set; } = default!;
    public string CouponCode { get; set; } = default!;
    public StockReservationStatus Status { get; set; } = StockReservationStatus.Reserved;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? SettledAtUtc { get; set; }
}

public sealed class CatalogOutboxMessage
{
    public Guid Id { get; set; }
    public DateTime OccurredAtUtc { get; set; }
    public string EventType { get; set; } = default!;
    public string Payload { get; set; } = default!;
    public DateTime? ProcessedAtUtc { get; set; }
    public int Attempts { get; set; }
    public string? LastError { get; set; }
}
