using MediatR;
using OrderService.Application.Features.Queries.ViewModels;
using OrderService.Application.Interfaces.Repositories;

namespace OrderService.Application.Features.Queries.GetOrderDetailById
{
    public class GetOrderDetailsQueryHandler : IRequestHandler<GetOrderDetailsQuery, OrderDetailViewModel?>
    {
        private readonly IOrderRepository orderRepository;
        public GetOrderDetailsQueryHandler(IOrderRepository orderRepository)
        {
            this.orderRepository = orderRepository ?? throw new ArgumentNullException(nameof(orderRepository));
        }

        public async Task<OrderDetailViewModel?> Handle(GetOrderDetailsQuery request, CancellationToken cancellationToken)
        {
            var order = await orderRepository.GetWithItemsAsync(request.OrderId, cancellationToken);

            if (order is null) return null;

            return new OrderDetailViewModel
            {
                Id = order.Id,
                Ordernumber = order.OrderNumber,
                Date = order.OrderDate,
                StatusId = order.OrderStatusId,
                Status = order.OrderStatus?.Name ?? string.Empty,
                Description = order.Description,
                UserId = order.UserId,
                UserName = order.UserName,
                Street = order.Address.Street,
                City = order.Address.City,
                State = order.Address.State,
                Country = order.Address.Country,
                Zipcode = order.Address.ZipCode,
                CouponCode = order.CouponCode,
                DiscountAmount = order.DiscountAmount,
                Subtotal = order.OrderItems.Sum(item => item.Units * item.UnitPrice),
                Total = order.TotalAmount,
                PaidAtUtc = order.PaidAtUtc,
                ShippedAtUtc = order.ShippedAtUtc,
                CancelledAtUtc = order.CancelledAtUtc,
                CancelReason = order.CancelReason,
                Orderitems = order.OrderItems.Select(item => new Orderitem
                {
                    ProductId = item.ProductId,
                    Productname = item.ProductName,
                    Units = item.Units,
                    Unitprice = item.UnitPrice,
                    Pictureurl = item.PictureUrl,
                    VariantId = item.VariantId,
                    VariantLabel = item.VariantLabel,
                    LineTotal = item.Units * item.UnitPrice
                }).ToList()
            };
        }
    }
}
