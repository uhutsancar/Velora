using Microsoft.EntityFrameworkCore;
using OrderService.Application.Interfaces.Repositories;
using OrderService.Domain.AggregateModels.OrderAggregate;
using OrderService.Infrastructure.Context;
using System.Linq.Expressions;

namespace OrderService.Infrastructure.Repositories
{
    public class OrderRepository : GenericRepository<Order>, IOrderRepository
    {
        public OrderRepository(OrderDbContext dbContext) : base(dbContext)
        {
        }

        public override async Task<Order?> GetByIdAsync(Guid id, params Expression<Func<Order, object>>[] includes)
        {
            var entity = await base.GetByIdAsync(id, includes);

            // The aggregate may still be in the change tracker when a domain event
            // handler asks for it inside the same unit of work.
            return entity ?? DbContext.Orders.Local.FirstOrDefault(i => i.Id == id);
        }

        public Task<Order?> GetWithItemsAsync(Guid id, CancellationToken ct = default) =>
            DbContext.Orders
                .Include(o => o.OrderItems)
                .Include(o => o.OrderStatus)
                .Include(o => o.Buyer)
                .FirstOrDefaultAsync(o => o.Id == id, ct);

        public async Task<(IReadOnlyList<Order> Items, long Total)> ListAsync(OrderListFilter filter, CancellationToken ct = default)
        {
            var query = BuildQuery(filter);

            var total = await query.LongCountAsync(ct);

            var pageSize = Math.Clamp(filter.PageSize, 1, 100);

            var items = await query
                .OrderByDescending(o => o.OrderDate)
                .Skip(filter.PageIndex * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            return (items, total);
        }

        public async Task<IReadOnlyList<Order>> GetForAnalyticsAsync(DateTime fromUtc, DateTime toUtc, CancellationToken ct = default) =>
            await DbContext.Orders
                .AsNoTracking()
                .Include(o => o.OrderItems)
                .Include(o => o.OrderStatus)
                .Where(o => o.OrderDate >= fromUtc && o.OrderDate <= toUtc)
                .ToListAsync(ct);

        private IQueryable<Order> BuildQuery(OrderListFilter filter)
        {
            var query = DbContext.Orders
                .AsNoTracking()
                .Include(o => o.OrderItems)
                .Include(o => o.OrderStatus)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(filter.UserId))
                query = query.Where(o => o.UserId == filter.UserId);

            if (filter.StatusId is { } statusId)
                query = query.Where(o => o.OrderStatus.Id == statusId);

            if (filter.FromUtc is { } from)
                query = query.Where(o => o.OrderDate >= from);

            if (filter.ToUtc is { } to)
                query = query.Where(o => o.OrderDate <= to);

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var term = filter.Search.Trim().ToLower();
                query = query.Where(o =>
                    o.OrderNumber.ToLower().Contains(term) ||
                    (o.UserName != null && o.UserName.ToLower().Contains(term)) ||
                    o.OrderItems.Any(i => i.ProductName.ToLower().Contains(term)));
            }

            return query;
        }
    }
}
