using OrderService.Domain.AggregateModels.BuyerAggregate;
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
            string userName,
            Address address,
            int cardTypeId,
            string cardNumber,
            string cardSecurityNumber,
            string cardHolderName,
            DateTime cardExpiration,
            Guid? paymentMethodId,
            Guid? buyerId = null,
            string? userId = null,
            string? description = null) : this()
        {
            BuyerId = buyerId;
            UserId = userId;
            UserName = userName;
            Description = description;
            orderStatusId = OrderStatus.Submitted.Id;
            OrderDate = DateTime.UtcNow;
            Address = address;
            PaymentMethodId = paymentMethodId;
            OrderNumber = GenerateOrderNumber(OrderDate);

            AddOrderStartedDomainEvent(userName, cardTypeId, cardNumber, cardSecurityNumber, cardHolderName, cardExpiration);
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

        public string? CouponCode { get; private set; }

        public string? Description { get; private set; }

        public string? CancelReason { get; private set; }

        public DateTime? PaidAtUtc { get; private set; }

        public DateTime? ShippedAtUtc { get; private set; }

        public DateTime? CancelledAtUtc { get; private set; }

        public Guid? BuyerId { get; private set; }

        public Buyer? Buyer { get; private set; }

        public Address Address { get; private set; } = default!;

        public OrderStatus OrderStatus { get; private set; } = default!;

        /// <summary>Read-only projection of the backing status id for queries and mapping.</summary>
        public int OrderStatusId => orderStatusId;

        public IReadOnlyCollection<OrderItem> OrderItems => _orderItems;

        public Guid? PaymentMethodId { get; set; }

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

        public void SetBuyerId(Guid buyerId) => BuyerId = buyerId;

        public void SetPaymentMethodId(Guid paymentMethodId) => PaymentMethodId = paymentMethodId;

        public void SetAwaitingValidationStatus()
        {
            if (orderStatusId != OrderStatus.Submitted.Id)
                ThrowInvalidTransition(OrderStatus.AwaitingValidation);

            orderStatusId = OrderStatus.AwaitingValidation.Id;
        }

        public void SetStockConfirmedStatus()
        {
            if (orderStatusId != OrderStatus.Submitted.Id && orderStatusId != OrderStatus.AwaitingValidation.Id)
                ThrowInvalidTransition(OrderStatus.StockConfirmed);

            orderStatusId = OrderStatus.StockConfirmed.Id;
        }

        public void SetPaidStatus()
        {
            if (orderStatusId == OrderStatus.Cancelled.Id || orderStatusId == OrderStatus.Shipped.Id)
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
            if (orderStatusId != OrderStatus.Paid.Id && orderStatusId != OrderStatus.StockConfirmed.Id)
                ThrowInvalidTransition(OrderStatus.Shipped);

            orderStatusId = OrderStatus.Shipped.Id;
            ShippedAtUtc = DateTime.UtcNow;

            AddDomainEvent(new OrderStatusChangedDomainEvent(Id, OrderStatus.Shipped.Id, OrderStatus.Shipped.Name, UserId, UserName));
        }

        public void SetCancelledStatus(string? reason = null)
        {
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

        private void AddOrderStartedDomainEvent(string userName, int cardTypeId, string cardNumber,
            string cardSecurityNumber, string cardHolderName, DateTime cardExpiration)
        {
            AddDomainEvent(new OrderStartedDomainEvent(this, userName, cardTypeId,
                cardNumber, cardSecurityNumber, cardHolderName, cardExpiration));
        }

        private void ThrowInvalidTransition(OrderStatus target) =>
            throw new OrderingDomainException($"'{OrderStatus.From(orderStatusId).Name}' durumundan '{target.Name}' durumuna geçilemez.");

        private static string GenerateOrderNumber(DateTime orderDate) =>
            $"VLR-{orderDate:yyMMdd}-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
    }
}
