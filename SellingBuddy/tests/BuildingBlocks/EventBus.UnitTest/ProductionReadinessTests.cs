using EventBus.Base.Events;
using OrderService.Domain.AggregateModels.OrderAggregate;

namespace EventBus.UnitTest;

[TestClass]
public sealed class ProductionReadinessTests
{
    [TestMethod]
    public void Order_contract_exposes_only_tokenized_payment_reference()
    {
        var names = typeof(Order)
            .GetProperties()
            .Select(property => property.Name)
            .ToList();

        CollectionAssert.Contains(names, nameof(Order.PaymentProvider));
        CollectionAssert.Contains(names, nameof(Order.PaymentMethodToken));

        foreach (var forbidden in new[] { "CardNumber", "Cvv", "Cvc", "Expiry", "CardHolderName" })
            CollectionAssert.DoesNotContain(names, forbidden, $"Raw payment field returned: {forbidden}");
    }

    [TestMethod]
    public void Integration_event_keeps_correlation_and_causation_context()
    {
        var correlationId = Guid.NewGuid();
        var causationId = Guid.NewGuid();
        var integrationEvent = new IntegrationEvent();

        integrationEvent.SetContext(correlationId, causationId);

        Assert.AreEqual(correlationId, integrationEvent.CorrelationId);
        Assert.AreEqual(causationId, integrationEvent.CausationId);
        Assert.AreNotEqual(Guid.Empty, integrationEvent.Id);
        Assert.AreEqual(1, integrationEvent.SchemaVersion);
    }
}
