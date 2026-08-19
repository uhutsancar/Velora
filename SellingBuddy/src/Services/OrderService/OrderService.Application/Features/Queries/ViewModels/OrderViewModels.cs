namespace OrderService.Application.Features.Queries.ViewModels
{
    /// <summary>Row shape for the customer "my orders" list and the back-office table.</summary>
    public class OrderSummaryViewModel
    {
        public Guid Id { get; set; }
        public string OrderNumber { get; set; } = default!;
        public DateTime Date { get; set; }
        public int StatusId { get; set; }
        public string Status { get; set; } = default!;
        public decimal Total { get; set; }
        public decimal DiscountAmount { get; set; }
        public int ItemCount { get; set; }
        public string? UserId { get; set; }
        public string? UserName { get; set; }
        public string? City { get; set; }
        public string? Country { get; set; }
        public string? FirstItemName { get; set; }
        public string? FirstItemImage { get; set; }
    }

    /// <summary>Order status reference data for filters and status pickers.</summary>
    public class OrderStatusViewModel
    {
        public int Id { get; set; }
        public string Name { get; set; } = default!;
    }

    // ---------- analytics ----------

    public class SalesSummaryViewModel
    {
        public decimal TotalRevenue { get; set; }
        public decimal TodayRevenue { get; set; }
        public decimal MonthRevenue { get; set; }
        public decimal PreviousMonthRevenue { get; set; }
        public decimal AverageOrderValue { get; set; }
        public int TotalOrders { get; set; }
        public int TodayOrders { get; set; }
        public int MonthOrders { get; set; }
        public int PendingOrders { get; set; }
        public int CancelledOrders { get; set; }
        public int UniqueCustomers { get; set; }

        /// <summary>Month-over-month revenue change in percent.</summary>
        public decimal RevenueGrowthPercentage { get; set; }
    }

    public class SalesPointViewModel
    {
        public DateTime Date { get; set; }
        public decimal Revenue { get; set; }
        public int Orders { get; set; }
    }

    public class TopProductViewModel
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = default!;
        public string? PictureUrl { get; set; }
        public int UnitsSold { get; set; }
        public decimal Revenue { get; set; }
    }

    public class OrderStatusBreakdownViewModel
    {
        public int StatusId { get; set; }
        public string Status { get; set; } = default!;
        public int Count { get; set; }
        public decimal Revenue { get; set; }
    }

    /// <summary>Everything the admin dashboard landing page needs, in one round trip.</summary>
    public class DashboardViewModel
    {
        public SalesSummaryViewModel Summary { get; set; } = new();
        public IReadOnlyCollection<SalesPointViewModel> SalesSeries { get; set; } = Array.Empty<SalesPointViewModel>();
        public IReadOnlyCollection<TopProductViewModel> TopProducts { get; set; } = Array.Empty<TopProductViewModel>();
        public IReadOnlyCollection<OrderStatusBreakdownViewModel> StatusBreakdown { get; set; } = Array.Empty<OrderStatusBreakdownViewModel>();
        public IReadOnlyCollection<OrderSummaryViewModel> RecentOrders { get; set; } = Array.Empty<OrderSummaryViewModel>();
    }
}
