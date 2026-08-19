using MediatR;
using OrderService.Application.Features.Queries.ViewModels;
using OrderService.Application.Interfaces.Repositories;
using OrderService.Domain.AggregateModels.OrderAggregate;
using Velora.Shared.Contracts;

namespace OrderService.Application.Features.Queries.GetOrders
{
    /// <summary>
    /// Paged order list. <see cref="UserId"/> is set from the access token for the
    /// customer endpoint and left null for the back office, which sees every order.
    /// </summary>
    public class GetOrdersQuery : IRequest<PagedResult<OrderSummaryViewModel>>
    {
        public string? UserId { get; set; }

        public string? Search { get; set; }

        public int? StatusId { get; set; }

        public DateTime? FromUtc { get; set; }

        public DateTime? ToUtc { get; set; }

        public int PageIndex { get; set; }

        public int PageSize { get; set; } = 20;
    }

    public class GetOrdersQueryHandler : IRequestHandler<GetOrdersQuery, PagedResult<OrderSummaryViewModel>>
    {
        private readonly IOrderRepository orderRepository;

        public GetOrdersQueryHandler(IOrderRepository orderRepository)
        {
            this.orderRepository = orderRepository;
        }

        public async Task<PagedResult<OrderSummaryViewModel>> Handle(GetOrdersQuery request, CancellationToken cancellationToken)
        {
            var pageSize = Math.Clamp(request.PageSize, 1, 100);

            var (items, total) = await orderRepository.ListAsync(new OrderListFilter
            {
                UserId = request.UserId,
                Search = request.Search,
                StatusId = request.StatusId,
                FromUtc = request.FromUtc,
                ToUtc = request.ToUtc,
                PageIndex = Math.Max(request.PageIndex, 0),
                PageSize = pageSize
            }, cancellationToken);

            return new PagedResult<OrderSummaryViewModel>(
                items.Select(OrderProjections.ToSummary).ToList(),
                request.PageIndex,
                pageSize,
                total);
        }
    }

    /// <summary>Shared hand written projections for the order read models.</summary>
    public static class OrderProjections
    {
        public static OrderSummaryViewModel ToSummary(Order order)
        {
            var firstItem = order.OrderItems.FirstOrDefault();

            return new OrderSummaryViewModel
            {
                Id = order.Id,
                OrderNumber = order.OrderNumber,
                Date = order.OrderDate,
                StatusId = order.OrderStatus?.Id ?? order.OrderStatusId,
                Status = order.OrderStatus?.Name ?? OrderStatus.From(order.OrderStatusId).Name,
                Total = order.TotalAmount,
                DiscountAmount = order.DiscountAmount,
                ItemCount = order.OrderItems.Sum(i => i.Units),
                UserId = order.UserId,
                UserName = order.UserName,
                City = order.Address?.City,
                Country = order.Address?.Country,
                FirstItemName = firstItem?.ProductName,
                FirstItemImage = firstItem?.PictureUrl
            };
        }
    }
}
