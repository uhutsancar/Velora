using OrderService.Domain.Events;
using OrderService.Domain.Exceptions;
using OrderService.Domain.SeedWork;

namespace OrderService.Domain.AggregateModels.OrderAggregate
{
    public class Order : BaseEntity, IAggregateRoot
    {
        private readonly List<OrderItem> _orderItems;

        private int orderStatusId;

        protected Order()
        {
            Id = Guid.NewGuid();
            _orderItems = new List<OrderItem>();
        }

        public Order(
            Guid orderId,
            string userName,
            Address address,
            string paymentProvider,
            string paymentMethodToken,
            string currency,
            string? userId = null,
            string? description = null) : this()
        {
            Id = orderId == Guid.Empty ? Guid.NewGuid() : orderId;
            UserId = userId;
            UserName = userName;
            Description = description;
            orderStatusId = OrderStatus.Submitted.Id;
            OrderDate = DateTime.UtcNow;
            Address = address;
            PaymentProvider = paymentProvider;
            PaymentMethodToken = paymentMethodToken;
            Currency = currency;
            OrderNumber = GenerateOrderNumber(OrderDate);
        }

        public DateTime OrderDate { get; private set; }

        /// <summary>Human friendly reference shown to the customer, e.g. "VLR-240819-4F2A".</summary>
        public string OrderNumber { get; private set; } = default!;

        /// <summary>Identity service user id, so a customer can list their own orders.</summary>
        public string? UserId { get; private set; }

        /// <summary>Display name captured at order time.</summary>
        public string? UserName { get; private set; }

        public int Quantity { get; private set; }

        /// <summary>Order total captured at purchase time; prices may change later.</summary>
        public decimal TotalAmount { get; private set; }

        public decimal DiscountAmount { get; private set; }

        public string Currency { get; private set; } = "TRY";

        public string PaymentProvider { get; private set; } = default!;

        /// <summary>Opaque PSP reference. Never a card number or CVV.</summary>
        public string PaymentMethodToken { get; private set; } = default!;

        public string? CouponCode { get; private set; }

        public string? Description { get; private set; }

        public string? CancelReason { get; private set; }

        public DateTime? PaidAtUtc { get; private set; }

        public DateTime? ShippedAtUtc { get; private set; }

        public DateTime? CancelledAtUtc { get; private set; }

        public Address Address { get; private set; } = default!;

        public OrderStatus OrderStatus { get; private set; } = default!;

        /// <summary>Read-only projection of the backing status id for queries and mapping.</summary>
        public int OrderStatusId => orderStatusId;

        public IReadOnlyCollection<OrderItem> OrderItems => _orderItems;

        public void AddOrderItem(int productId, string productName, decimal unitPrice, string pictureUrl, int units = 1, int? variantId = null, string? variantLabel = null)
        {
            if (units <= 0)
                throw new OrderingDomainException("Sipariş kalemi adedi sıfırdan büyük olmalı.");

            // Same product+variant collapses into one line instead of duplicating.
            var existing = _orderItems.FirstOrDefault(i => i.ProductId == productId && i.VariantId == variantId);

            if (existing is not null)
                existing.AddUnits(units);
            else
                _orderItems.Add(new OrderItem(productId, productName, unitPrice, pictureUrl, units, variantId, variantLabel));

            RecalculateTotals();
        }

        public void ApplyDiscount(string? couponCode, decimal discountAmount)
        {
            CouponCode = couponCode;
            DiscountAmount = Math.Max(0, discountAmount);

            RecalculateTotals();
        }

        public void SetAwaitingValidationStatus()
        {
            if (orderStatusId == OrderStatus.AwaitingValidation.Id)
                return;

            if (orderStatusId != OrderStatus.Submitted.Id)
                ThrowInvalidTransition(OrderStatus.AwaitingValidation);

            orderStatusId = OrderStatus.AwaitingValidation.Id;
        }

        public void SetStockConfirmedStatus()
        {
            if (orderStatusId == OrderStatus.StockConfirmed.Id)
                return;

            if (orderStatusId != OrderStatus.Submitted.Id && orderStatusId != OrderStatus.AwaitingValidation.Id)
                ThrowInvalidTransition(OrderStatus.StockConfirmed);

            orderStatusId = OrderStatus.StockConfirmed.Id;
        }

        public void SetPaidStatus()
        {
            // Payment webhooks and broker deliveries are at-least-once. Replaying a
            // successful payment must not emit another paid/coupon side effect.
            if (orderStatusId == OrderStatus.Paid.Id)
                return;

            if (orderStatusId != OrderStatus.Submitted.Id &&
                orderStatusId != OrderStatus.AwaitingValidation.Id &&
                orderStatusId != OrderStatus.StockConfirmed.Id)
                ThrowInvalidTransition(OrderStatus.Paid);

            orderStatusId = OrderStatus.Paid.Id;
            PaidAtUtc = DateTime.UtcNow;

            AddDomainEvent(new OrderStatusChangedDomainEvent(Id, OrderStatus.Paid.Id, OrderStatus.Paid.Name, UserId, UserName));

            // Payment is where the coupon is actually consumed, so the catalogue needs
            // the code and the amounts, not just "the status changed".
            AddDomainEvent(new OrderPaidDomainEvent(Id, OrderNumber, UserId, CouponCode, DiscountAmount, TotalAmount));
        }

        public void SetShippedStatus()
        {
            if (orderStatusId == OrderStatus.Shipped.Id)
                return;

            // Shipping is a fulfilment action and is only valid after confirmed payment.
            if (orderStatusId != OrderStatus.Paid.Id)
                ThrowInvalidTransition(OrderStatus.Shipped);

            orderStatusId = OrderStatus.Shipped.Id;
            ShippedAtUtc = DateTime.UtcNow;

            AddDomainEvent(new OrderStatusChangedDomainEvent(Id, OrderStatus.Shipped.Id, OrderStatus.Shipped.Name, UserId, UserName));
        }

        public void SetCancelledStatus(string? reason = null)
        {
            if (orderStatusId == OrderStatus.Cancelled.Id)
                return;

            if (orderStatusId == OrderStatus.Paid.Id)
                throw new OrderingDomainException("A paid order cannot be cancelled directly; start the refund workflow.");

            if (orderStatusId == OrderStatus.Shipped.Id)
                throw new OrderingDomainException("Kargoya verilmiş bir sipariş iptal edilemez.");

            orderStatusId = OrderStatus.Cancelled.Id;
            CancelledAtUtc = DateTime.UtcNow;
            CancelReason = reason;

            AddDomainEvent(new OrderStatusChangedDomainEvent(Id, OrderStatus.Cancelled.Id, OrderStatus.Cancelled.Name, UserId, UserName));
        }

        /// <summary>Applies a status coming from the back office, honouring the same rules.</summary>
        public void ChangeStatus(int targetStatusId, string? reason = null)
        {
            var target = OrderStatus.From(targetStatusId);

            if (target.Id == OrderStatus.Cancelled.Id) { SetCancelledStatus(reason); return; }
            if (target.Id == OrderStatus.Shipped.Id) { SetShippedStatus(); return; }
            if (target.Id == OrderStatus.Paid.Id) { SetPaidStatus(); return; }
            if (target.Id == OrderStatus.StockConfirmed.Id) { SetStockConfirmedStatus(); return; }
            if (target.Id == OrderStatus.AwaitingValidation.Id) { SetAwaitingValidationStatus(); return; }

            throw new OrderingDomainException($"'{target.Name}' durumuna geçiş desteklenmiyor.");
        }

        private void RecalculateTotals()
        {
            Quantity = _orderItems.Sum(i => i.Units);

            var subtotal = _orderItems.Sum(i => i.UnitPrice * i.Units);

            TotalAmount = Math.Max(0, subtotal - DiscountAmount);
        }

        private void ThrowInvalidTransition(OrderStatus target) =>
            throw new OrderingDomainException($"'{OrderStatus.From(orderStatusId).Name}' durumundan '{target.Name}' durumuna geçilemez.");

        private static string GenerateOrderNumber(DateTime orderDate) =>
            $"VLR-{orderDate:yyMMdd}-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
    }
}
