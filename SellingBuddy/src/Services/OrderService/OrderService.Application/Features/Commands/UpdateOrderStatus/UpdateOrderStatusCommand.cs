using MediatR;
using OrderService.Application.Interfaces.Repositories;
using Velora.Shared.Middleware;

namespace OrderService.Application.Features.Commands.UpdateOrderStatus
{
    /// <summary>Back-office status transition. Rules live in the aggregate, not here.</summary>
    public class UpdateOrderStatusCommand : IRequest<bool>
    {
        public Guid OrderId { get; set; }

        public int StatusId { get; set; }

        public string? Reason { get; set; }
    }

    public class UpdateOrderStatusCommandHandler : IRequestHandler<UpdateOrderStatusCommand, bool>
    {
        private readonly IOrderRepository orderRepository;

        public UpdateOrderStatusCommandHandler(IOrderRepository orderRepository)
        {
            this.orderRepository = orderRepository;
        }

        public async Task<bool> Handle(UpdateOrderStatusCommand request, CancellationToken cancellationToken)
        {
            var order = await orderRepository.GetWithItemsAsync(request.OrderId, cancellationToken)
                        ?? throw new ApiException("Sipariş bulunamadı.", 404, "not_found");

            order.ChangeStatus(request.StatusId, request.Reason);

            orderRepository.Update(order);
            await orderRepository.UnitOfWork.SaveEntitiesAsync(cancellationToken);

            return true;
        }
    }

    /// <summary>Customer-initiated cancellation, restricted to the order owner.</summary>
    public class CancelOrderCommand : IRequest<bool>
    {
        public Guid OrderId { get; set; }

        public string UserId { get; set; } = default!;

        public string? Reason { get; set; }
    }

    public class CancelOrderCommandHandler : IRequestHandler<CancelOrderCommand, bool>
    {
        private readonly IOrderRepository orderRepository;

        public CancelOrderCommandHandler(IOrderRepository orderRepository)
        {
            this.orderRepository = orderRepository;
        }

        public async Task<bool> Handle(CancelOrderCommand request, CancellationToken cancellationToken)
        {
            var order = await orderRepository.GetWithItemsAsync(request.OrderId, cancellationToken)
                        ?? throw new ApiException("Sipariş bulunamadı.", 404, "not_found");

            // Ownership is re-checked here so the API layer can never be the only gate.
            if (!string.Equals(order.UserId, request.UserId, StringComparison.Ordinal))
                throw new ApiException("Bu siparişi iptal etme yetkiniz yok.", 403, "forbidden");

            order.SetCancelledStatus(request.Reason);

            orderRepository.Update(order);
            await orderRepository.UnitOfWork.SaveEntitiesAsync(cancellationToken);

            return true;
        }
    }
}
