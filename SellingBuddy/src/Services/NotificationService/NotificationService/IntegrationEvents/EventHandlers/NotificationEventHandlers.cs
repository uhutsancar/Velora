using EventBus.Base.Abstraction;
using Microsoft.Extensions.Logging;
using NotificationService.IntegrationEvents.Events;

namespace NotificationService.IntegrationEvents.EventHandlers
{
    /// <summary>
    /// Notification fan-out. Today every handler logs; swapping in a real e-mail/SMS
    /// provider is a change inside these handlers only.
    /// </summary>
    public class OrderPaymentSuccessIntegrationEventHandler : IIntegrationEventHandler<OrderPaymentSuccessIntegrationEvent>
    {
        private readonly ILogger<OrderPaymentSuccessIntegrationEventHandler> logger;

        public OrderPaymentSuccessIntegrationEventHandler(ILogger<OrderPaymentSuccessIntegrationEventHandler> logger)
        {
            this.logger = logger;
        }

        public Task Handle(OrderPaymentSuccessIntegrationEvent @event)
        {
            logger.LogInformation("[NOTIFY] Ödeme onaylandı. Sipariş {OrderNumber} ({OrderId}), tutar {Total}.",
                @event.OrderNumber, @event.OrderId, @event.TotalAmount);

            return Task.CompletedTask;
        }
    }

    public class OrderPaymentFailedIntegrationEventHandler : IIntegrationEventHandler<OrderPaymentFailedIntegrationEvent>
    {
        private readonly ILogger<OrderPaymentFailedIntegrationEventHandler> logger;

        public OrderPaymentFailedIntegrationEventHandler(ILogger<OrderPaymentFailedIntegrationEventHandler> logger)
        {
            this.logger = logger;
        }

        public Task Handle(OrderPaymentFailedIntegrationEvent @event)
        {
            logger.LogWarning("[NOTIFY] Ödeme başarısız. Sipariş {OrderNumber} ({OrderId}): {Error}",
                @event.OrderNumber, @event.OrderId, @event.ErrorMessage);

            return Task.CompletedTask;
        }
    }

    public class OrderStatusChangedIntegrationEventHandler : IIntegrationEventHandler<OrderStatusChangedIntegrationEvent>
    {
        private readonly ILogger<OrderStatusChangedIntegrationEventHandler> logger;

        public OrderStatusChangedIntegrationEventHandler(ILogger<OrderStatusChangedIntegrationEventHandler> logger)
        {
            this.logger = logger;
        }

        public Task Handle(OrderStatusChangedIntegrationEvent @event)
        {
            logger.LogInformation("[NOTIFY] {UserName} kullanıcısının {OrderId} numaralı siparişi '{Status}' durumuna geçti.",
                @event.UserName ?? "Misafir", @event.OrderId, @event.StatusName);

            return Task.CompletedTask;
        }
    }

    /// <summary>Confirms payment to the customer; the receipt e-mail would go out here.</summary>
    public class OrderPaidIntegrationEventHandler : IIntegrationEventHandler<OrderPaidIntegrationEvent>
    {
        private readonly ILogger<OrderPaidIntegrationEventHandler> logger;

        public OrderPaidIntegrationEventHandler(ILogger<OrderPaidIntegrationEventHandler> logger)
        {
            this.logger = logger;
        }

        public Task Handle(OrderPaidIntegrationEvent @event)
        {
            logger.LogInformation(
                "[NOTIFY] {OrderNumber} siparişinin ödemesi tamamlandı. Tutar {Total}{Coupon}.",
                @event.OrderNumber,
                @event.TotalAmount,
                string.IsNullOrEmpty(@event.CouponCode) ? string.Empty : $", kupon {@event.CouponCode}");

            return Task.CompletedTask;
        }
    }

    /// <summary>Raises an operational alert when a product runs out of stock.</summary>
    public class ProductStockChangedIntegrationEventHandler : IIntegrationEventHandler<ProductStockChangedIntegrationEvent>
    {
        private const int LowStockThreshold = 5;

        private readonly ILogger<ProductStockChangedIntegrationEventHandler> logger;

        public ProductStockChangedIntegrationEventHandler(ILogger<ProductStockChangedIntegrationEventHandler> logger)
        {
            this.logger = logger;
        }

        public Task Handle(ProductStockChangedIntegrationEvent @event)
        {
            if (@event.NewStock == 0)
                logger.LogWarning("[NOTIFY] {ProductId} numaralı ürünün stoğu tükendi.", @event.ProductId);
            else if (@event.NewStock <= LowStockThreshold)
                logger.LogWarning("[NOTIFY] {ProductId} numaralı üründe kritik stok: {Stock} adet kaldı.",
                    @event.ProductId, @event.NewStock);

            return Task.CompletedTask;
        }
    }
}
