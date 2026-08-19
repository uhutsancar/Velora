using MediatR;
using OrderService.Application.Features.Queries.GetOrders;
using OrderService.Application.Features.Queries.ViewModels;
using OrderService.Application.Interfaces.Repositories;
using OrderService.Domain.AggregateModels.OrderAggregate;

namespace OrderService.Application.Features.Queries.GetDashboard
{
    /// <summary>
    /// Builds every KPI the admin dashboard renders. Cancelled orders are excluded from
    /// revenue so the numbers match what was actually collected.
    /// </summary>
    public class GetDashboardQuery : IRequest<DashboardViewModel>
    {
        /// <summary>Length of the sales time series, in days.</summary>
        public int Days { get; set; } = 30;

        public int TopProductCount { get; set; } = 8;

        public int RecentOrderCount { get; set; } = 8;
    }

    public class GetDashboardQueryHandler : IRequestHandler<GetDashboardQuery, DashboardViewModel>
    {
        private static readonly int[] RevenueStatuses =
        {
            OrderStatus.StockConfirmed.Id,
            OrderStatus.Paid.Id,
            OrderStatus.Shipped.Id
        };

        private readonly IOrderRepository orderRepository;

        public GetDashboardQueryHandler(IOrderRepository orderRepository)
        {
            this.orderRepository = orderRepository;
        }

        public async Task<DashboardViewModel> Handle(GetDashboardQuery request, CancellationToken cancellationToken)
        {
            var days = Math.Clamp(request.Days, 7, 365);

            var nowUtc = DateTime.UtcNow;
            var todayStart = nowUtc.Date;
            var monthStart = new DateTime(nowUtc.Year, nowUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var previousMonthStart = monthStart.AddMonths(-1);

            // One read covers the series, the KPIs and the previous-month comparison.
            var windowStart = new[] { nowUtc.AddDays(-days).Date, previousMonthStart }.Min();

            var orders = await orderRepository.GetForAnalyticsAsync(windowStart, nowUtc, cancellationToken);

            var revenueOrders = orders.Where(IsRevenue).ToList();

            var summary = new SalesSummaryViewModel
            {
                TotalRevenue = revenueOrders.Sum(o => o.TotalAmount),
                TodayRevenue = revenueOrders.Where(o => o.OrderDate >= todayStart).Sum(o => o.TotalAmount),
                MonthRevenue = revenueOrders.Where(o => o.OrderDate >= monthStart).Sum(o => o.TotalAmount),
                PreviousMonthRevenue = revenueOrders
                    .Where(o => o.OrderDate >= previousMonthStart && o.OrderDate < monthStart)
                    .Sum(o => o.TotalAmount),
                TotalOrders = orders.Count,
                TodayOrders = orders.Count(o => o.OrderDate >= todayStart),
                MonthOrders = orders.Count(o => o.OrderDate >= monthStart),
                PendingOrders = orders.Count(o => o.OrderStatusId == OrderStatus.Submitted.Id ||
                                                  o.OrderStatusId == OrderStatus.AwaitingValidation.Id),
                CancelledOrders = orders.Count(o => o.OrderStatusId == OrderStatus.Cancelled.Id),
                UniqueCustomers = orders.Where(o => o.UserId != null).Select(o => o.UserId).Distinct().Count()
            };

            summary.AverageOrderValue = revenueOrders.Count == 0
                ? 0
                : Math.Round(summary.TotalRevenue / revenueOrders.Count, 2);

            summary.RevenueGrowthPercentage = summary.PreviousMonthRevenue == 0
                ? (summary.MonthRevenue > 0 ? 100 : 0)
                : Math.Round((summary.MonthRevenue - summary.PreviousMonthRevenue) / summary.PreviousMonthRevenue * 100, 2);

            // Dense series: days with no orders still produce a zero point so the chart has no gaps.
            var seriesStart = nowUtc.AddDays(-days).Date;
            var byDay = orders
                .Where(o => o.OrderDate >= seriesStart)
                .GroupBy(o => o.OrderDate.Date)
                .ToDictionary(g => g.Key, g => g.ToList());

            var series = Enumerable.Range(0, days + 1)
                .Select(offset => seriesStart.AddDays(offset))
                .Where(date => date <= todayStart)
                .Select(date =>
                {
                    var dayOrders = byDay.GetValueOrDefault(date) ?? new List<Order>();

                    return new SalesPointViewModel
                    {
                        Date = date,
                        Orders = dayOrders.Count,
                        Revenue = dayOrders.Where(IsRevenue).Sum(o => o.TotalAmount)
                    };
                })
                .ToList();

            var topProducts = revenueOrders
                .SelectMany(o => o.OrderItems)
                .GroupBy(i => new { i.ProductId, i.ProductName })
                .Select(g => new TopProductViewModel
                {
                    ProductId = g.Key.ProductId,
                    ProductName = g.Key.ProductName,
                    PictureUrl = g.Select(i => i.PictureUrl).FirstOrDefault(url => !string.IsNullOrEmpty(url)),
                    UnitsSold = g.Sum(i => i.Units),
                    Revenue = g.Sum(i => i.UnitPrice * i.Units)
                })
                .OrderByDescending(p => p.Revenue)
                .Take(Math.Clamp(request.TopProductCount, 1, 25))
                .ToList();

            var statusBreakdown = OrderStatus.List()
                .Select(status =>
                {
                    var matching = orders.Where(o => o.OrderStatusId == status.Id).ToList();

                    return new OrderStatusBreakdownViewModel
                    {
                        StatusId = status.Id,
                        Status = status.Name,
                        Count = matching.Count,
                        Revenue = matching.Sum(o => o.TotalAmount)
                    };
                })
                .ToList();

            var recentOrders = orders
                .OrderByDescending(o => o.OrderDate)
                .Take(Math.Clamp(request.RecentOrderCount, 1, 25))
                .Select(OrderProjections.ToSummary)
                .ToList();

            return new DashboardViewModel
            {
                Summary = summary,
                SalesSeries = series,
                TopProducts = topProducts,
                StatusBreakdown = statusBreakdown,
                RecentOrders = recentOrders
            };
        }

        private static bool IsRevenue(Order order) => RevenueStatuses.Contains(order.OrderStatusId);
    }
}
