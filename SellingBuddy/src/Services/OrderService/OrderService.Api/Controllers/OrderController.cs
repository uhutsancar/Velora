using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderService.Application.Features.Commands.UpdateOrderStatus;
using OrderService.Application.Features.Queries.GetOrderDetailById;
using OrderService.Application.Features.Queries.GetOrders;
using OrderService.Application.Features.Queries.ViewModels;
using OrderService.Domain.AggregateModels.OrderAggregate;
using Velora.Shared.Contracts;
using Velora.Shared.Security;

namespace OrderService.Api.Controllers
{
    /// <summary>Customer facing order API. Every action is scoped to the caller.</summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OrderController : ControllerBase
    {
        private readonly IMediator mediator;

        public OrderController(IMediator mediator)
        {
            this.mediator = mediator;
        }

        /// <summary>Orders belonging to the authenticated customer.</summary>
        [HttpGet]
        public Task<PagedResult<OrderSummaryViewModel>> GetMyOrders(
            [FromQuery] int? statusId,
            [FromQuery] int pageIndex = 0,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
            => mediator.Send(new GetOrdersQuery
            {
                UserId = User.GetUserKey(),
                StatusId = statusId,
                PageIndex = pageIndex,
                PageSize = pageSize
            }, ct);

        [HttpGet("statuses")]
        [AllowAnonymous]
        public IReadOnlyCollection<OrderStatusViewModel> Statuses() =>
            OrderStatus.List().Select(s => new OrderStatusViewModel { Id = s.Id, Name = s.Name }).ToList();

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<OrderDetailViewModel>> GetOrderDetailsById(Guid id, CancellationToken ct)
        {
            var order = await mediator.Send(new GetOrderDetailsQuery(id), ct);

            if (order is null) return NotFound();

            // A customer may only read their own order; the back office reads any.
            if (!User.IsAdmin() && !string.Equals(order.UserId, User.GetUserKey(), StringComparison.Ordinal))
                return Forbid();

            return order;
        }

        [HttpPost("{id:guid}/cancel")]
        public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelOrderRequest? request, CancellationToken ct)
        {
            await mediator.Send(new CancelOrderCommand
            {
                OrderId = id,
                UserId = User.GetUserKey(),
                Reason = request?.Reason
            }, ct);

            return NoContent();
        }
    }

    public class CancelOrderRequest
    {
        public string? Reason { get; set; }
    }
}
