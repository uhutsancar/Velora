using OrderService.Domain.AggregateModels.OrderAggregate;
using OrderService.Domain.Events;
using OrderService.Domain.Exceptions;

namespace EventBus.UnitTest;

[TestClass]
public sealed class OrderStateMachineTests
{
    [TestMethod]
    public void Repeated_payment_success_is_idempotent()
    {
        var order = CreateOrder();
        order.ClearDomainEvents();

        order.SetPaidStatus();
        order.SetPaidStatus();

        Assert.AreEqual(OrderStatus.Paid.Id, order.OrderStatusId);
        Assert.AreEqual(1, order.DomainEvents.Count(e => e is OrderPaidDomainEvent));
        Assert.AreEqual(1, order.DomainEvents.Count(e => e is OrderStatusChangedDomainEvent));
    }

    [TestMethod]
    public void Late_payment_failure_cannot_cancel_a_paid_order()
    {
        var order = CreateOrder();
        order.SetPaidStatus();

        Assert.ThrowsExactly<OrderingDomainException>(() => order.SetCancelledStatus("late failure"));
        Assert.AreEqual(OrderStatus.Paid.Id, order.OrderStatusId);
    }

    [TestMethod]
    public void Stock_confirmation_cannot_be_shipped_before_payment()
    {
        var order = CreateOrder();
        order.SetStockConfirmedStatus();

        Assert.ThrowsExactly<OrderingDomainException>(() => order.SetShippedStatus());
        Assert.AreEqual(OrderStatus.StockConfirmed.Id, order.OrderStatusId);
    }

    private static Order CreateOrder() => new(
        Guid.NewGuid(),
        "test-user",
        new Address("street", "city", "state", "country", "34000"),
        "sandbox",
        "sandbox_approved_test",
        "TRY",
        userId: "user-1");
}
