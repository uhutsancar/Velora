using Azure.Messaging.ServiceBus.Administration;

var connectionString = Environment.GetEnvironmentVariable("EventBus__ConnectionString");
var topicName = Environment.GetEnvironmentVariable("EVENTBUS_TOPIC") ?? "sellingbuddytopicname";
var subscriptionName = Environment.GetEnvironmentVariable("AZURE_DEBUG_SUBSCRIPTION") ?? "velora-debug-monitor";

if (string.IsNullOrWhiteSpace(connectionString))
{
    Console.Error.WriteLine("EventBus__ConnectionString is not configured.");
    return 2;
}

// AdministrationClient expects a namespace connection string. The supplied
// policy is topic-scoped, so keep its key but express the entity separately.
var namespaceConnectionString = string.Join(';', connectionString
    .Split(';', StringSplitOptions.RemoveEmptyEntries)
    .Where(part => !part.StartsWith("EntityPath=", StringComparison.OrdinalIgnoreCase))) + ";";

var management = new ServiceBusAdministrationClient(namespaceConnectionString);
var topic = (await management.GetTopicAsync(topicName)).Value;
if (topic.Status != EntityStatus.Active)
{
    topic.Status = EntityStatus.Active;
    await management.UpdateTopicAsync(topic);
    Console.WriteLine($"Enabled topic: {topicName}");
}

if (!(await management.SubscriptionExistsAsync(topicName, subscriptionName)).Value)
{
    var subscription = new CreateSubscriptionOptions(topicName, subscriptionName)
    {
        AutoDeleteOnIdle = TimeSpan.FromDays(1),
        DefaultMessageTimeToLive = TimeSpan.FromHours(1),
        LockDuration = TimeSpan.FromMinutes(1),
        MaxDeliveryCount = 10,
    };
    await management.CreateSubscriptionAsync(subscription);
    Console.WriteLine($"Created Azure observer subscription: {subscriptionName}");
}
else
{
    Console.WriteLine($"Azure observer subscription already exists: {subscriptionName}");
}

var enabled = 0;
await foreach (var subscription in management.GetSubscriptionsAsync(topicName))
{
    if (subscription.Status == EntityStatus.Active)
    {
        continue;
    }

    subscription.Status = EntityStatus.Active;
    await management.UpdateSubscriptionAsync(subscription);
    enabled++;
    Console.WriteLine($"Enabled subscription: {subscription.SubscriptionName}");
}

Console.WriteLine($"Topic: {topicName}");
Console.WriteLine($"Enabled subscriptions: {enabled}");
var runtime = (await management.GetSubscriptionRuntimePropertiesAsync(topicName, subscriptionName)).Value;
Console.WriteLine($"Observer active messages: {runtime.ActiveMessageCount}");
return 0;
