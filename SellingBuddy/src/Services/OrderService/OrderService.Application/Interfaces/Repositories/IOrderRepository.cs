using OrderService.Domain.AggregateModels.OrderAggregate;

namespace OrderService.Application.Interfaces.Repositories
{
    /// <summary>Query filters shared by the customer list and the back-office list.</summary>
    public sealed class OrderListFilter
    {
        public string? UserId { get; init; }

        public string? Search { get; init; }

        public int? StatusId { get; init; }

        public DateTime? FromUtc { get; init; }

        public DateTime? ToUtc { get; init; }

        public int PageIndex { get; init; }

        public int PageSize { get; init; } = 20;
    }

    public interface IOrderRepository : IGenericRepository<Order>
    {
        /// <summary>Paged order list with the item graph loaded.</summary>
        Task<(IReadOnlyList<Order> Items, long Total)> ListAsync(OrderListFilter filter, CancellationToken ct = default);

        /// <summary>Every order in a date window, used by the analytics queries.</summary>
        Task<IReadOnlyList<Order>> GetForAnalyticsAsync(DateTime fromUtc, DateTime toUtc, CancellationToken ct = default);

        Task<Order?> GetWithItemsAsync(Guid id, CancellationToken ct = default);
    }
}
