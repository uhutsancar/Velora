using MediatR;
using OrderService.Domain.Models;

namespace OrderService.Application.Features.Commands.CreateOrder
{
    public class CreateOrderCommand : IRequest<bool>
    {
        private readonly List<OrderItemDTO> _orderItems;

        public CreateOrderCommand()
        {
            _orderItems = new List<OrderItemDTO>();
        }

        public CreateOrderCommand(
            Guid orderId,
            List<BasketItem> basketItems,
            string userId,
            string username,
            string city,
            string street,
            string state,
            string country,
            string zipcode,
            string paymentProvider,
            string paymentMethodToken,
            string? couponCode = null,
            decimal discountAmount = 0,
            string currency = "TRY") : this()
        {
            OrderId = orderId;
            _orderItems = basketItems.Select(item => new OrderItemDTO
            {
                ProductId = item.ProductId,
                ProductName = item.ProductName,
                PictureUrl = item.PictureUrl,
                UnitPrice = item.UnitPrice,
                Units = item.Quantity,
                VariantId = item.VariantId,
                VariantLabel = item.VariantLabel
            }).ToList();

            UserId = userId;
            UserName = username;
            City = city;
            Street = street;
            State = state;
            Country = country;
            ZipCode = zipcode;
            PaymentProvider = paymentProvider;
            PaymentMethodToken = paymentMethodToken;
            CouponCode = couponCode;
            DiscountAmount = discountAmount;
            Currency = currency;
        }

        /// <summary>Identity service user id, so the customer can find the order later.</summary>
        public Guid OrderId { get; private set; }

        /// <summary>Identity service user id, so the customer can find the order later.</summary>
        public string UserId { get; private set; } = default!;

        public string UserName { get; private set; } = default!;

        public string City { get; private set; } = default!;

        public string Street { get; private set; } = default!;

        public string State { get; private set; } = default!;

        public string Country { get; private set; } = default!;

        public string ZipCode { get; private set; } = default!;

        public string PaymentProvider { get; private set; } = default!;

        public string PaymentMethodToken { get; private set; } = default!;

        public string? CouponCode { get; private set; }

        public decimal DiscountAmount { get; private set; }

        public string Currency { get; private set; } = "TRY";

        public IEnumerable<OrderItemDTO> OrderItems => _orderItems;
    }

    public class OrderItemDTO
    {
        public int ProductId { get; init; }

        public string ProductName { get; init; } = default!;

        public decimal UnitPrice { get; init; }

        public int Units { get; init; }

        public string? PictureUrl { get; init; }

        public int? VariantId { get; init; }

        public string? VariantLabel { get; init; }
    }
}
