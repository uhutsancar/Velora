using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderService.Application.Features.Commands.UpdateOrderStatus;
using OrderService.Application.Features.Queries.GetDashboard;
using OrderService.Application.Features.Queries.GetOrderDetailById;
using OrderService.Application.Features.Queries.GetOrders;
using OrderService.Application.Features.Queries.ViewModels;
using Velora.Shared.Contracts;
using Velora.Shared.Security;

namespace OrderService.Api.Controllers
{
    /// <summary>Back-office order management.</summary>
    [Route("api/admin/orders")]
    [ApiController]
    [Authorize(Policy = VeloraPolicies.OrdersRead)]
    public class AdminOrdersController : ControllerBase
    {
        private readonly IMediator mediator;

        public AdminOrdersController(IMediator mediator)
        {
            this.mediator = mediator;
        }

        [HttpGet]
        public Task<PagedResult<OrderSummaryViewModel>> List([FromQuery] GetOrdersQuery query, CancellationToken ct)
        {
            // The back office sees every customer, so the user filter is cleared.
            query.UserId = null;

            return mediator.Send(query, ct);
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<OrderDetailViewModel>> GetById(Guid id, CancellationToken ct)
        {
            var order = await mediator.Send(new GetOrderDetailsQuery(id), ct);

            return order is null ? NotFound() : order;
        }

        [HttpPut("{id:guid}/status")]
        [Authorize(Policy = VeloraPolicies.OrdersWrite)]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateOrderStatusRequest request, CancellationToken ct)
        {
            await mediator.Send(new UpdateOrderStatusCommand
            {
                OrderId = id,
                StatusId = request.StatusId,
                Reason = request.Reason
            }, ct);

            return NoContent();
        }
    }

    /// <summary>Sales analytics for the admin dashboard.</summary>
    [Route("api/admin/analytics")]
    [ApiController]
    [Authorize(Policy = VeloraPolicies.AnalyticsRead)]
    public class AnalyticsController : ControllerBase
    {
        private readonly IMediator mediator;

        public AnalyticsController(IMediator mediator)
        {
            this.mediator = mediator;
        }

        /// <summary>Every dashboard widget in a single round trip.</summary>
        [HttpGet("dashboard")]
        public Task<DashboardViewModel> Dashboard(
            [FromQuery] int days = 30,
            [FromQuery] int topProducts = 8,
            [FromQuery] int recentOrders = 8,
            CancellationToken ct = default)
            => mediator.Send(new GetDashboardQuery
            {
                Days = days,
                TopProductCount = topProducts,
                RecentOrderCount = recentOrders
            }, ct);
    }

    public class UpdateOrderStatusRequest
    {
        public int StatusId { get; set; }

        public string? Reason { get; set; }
    }
}
