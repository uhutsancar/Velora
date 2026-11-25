using System.Text.Json;
using Azure.Messaging.ServiceBus;
using Azure.Messaging.ServiceBus.Administration;

var connectionString = Environment.GetEnvironmentVariable("EventBus__ConnectionString");
var topicName = Environment.GetEnvironmentVariable("EVENTBUS_TOPIC") ?? "sellingbuddytopicname";
var subscriptionName = Environment.GetEnvironmentVariable("AZURE_DEBUG_SUBSCRIPTION") ?? "velora-debug-monitor";
var action = (Environment.GetEnvironmentVariable("AZURE_TOPIC_ACTION") ?? "observe").Trim().ToLowerInvariant();

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

if (action == "report")
{
    var endpoint = namespaceConnectionString
        .Split(';', StringSplitOptions.RemoveEmptyEntries)
        .FirstOrDefault(part => part.StartsWith("Endpoint=", StringComparison.OrdinalIgnoreCase))?
        .Split('=', 2)[1]
        .TrimEnd('/') ?? "unknown";

    var subscriptions = new List<object>();
    await foreach (var subscription in management.GetSubscriptionsAsync(topicName))
    {
        var reportRuntime = (await management.GetSubscriptionRuntimePropertiesAsync(topicName, subscription.SubscriptionName)).Value;
        var rules = new List<object>();
        await foreach (var rule in management.GetRulesAsync(topicName, subscription.SubscriptionName))
        {
            var filter = rule.Filter switch
            {
                SqlRuleFilter sql => sql.SqlExpression,
                CorrelationRuleFilter correlation => JsonSerializer.Serialize(new
                {
                    correlation.CorrelationId,
                    correlation.MessageId,
                    correlation.Subject,
                    correlation.SessionId,
                    correlation.ReplyTo,
                    correlation.ReplyToSessionId,
                    correlation.To,
                    correlation.ContentType,
                    Properties = correlation.ApplicationProperties,
                }),
                _ => rule.Filter.GetType().Name,
            };
            rules.Add(new { rule.Name, FilterType = rule.Filter.GetType().Name, Filter = filter });
        }

        subscriptions.Add(new
        {
            subscription.SubscriptionName,
            Status = subscription.Status.ToString(),
            subscription.MaxDeliveryCount,
            LockDuration = subscription.LockDuration.ToString(),
            DefaultMessageTimeToLive = subscription.DefaultMessageTimeToLive.ToString(),
            reportRuntime.ActiveMessageCount,
            reportRuntime.DeadLetterMessageCount,
            reportRuntime.TotalMessageCount,
            reportRuntime.TransferMessageCount,
            reportRuntime.TransferDeadLetterMessageCount,
            Rules = rules,
        });
    }

    var messages = new List<object>();
    if ((await management.SubscriptionExistsAsync(topicName, subscriptionName)).Value)
    {
        await using var client = new ServiceBusClient(namespaceConnectionString);
        var receiver = client.CreateReceiver(topicName, subscriptionName);
        var peeked = await receiver.PeekMessagesAsync(100);
        foreach (var message in peeked)
        {
            messages.Add(new
            {
                message.MessageId,
                message.CorrelationId,
                message.Subject,
                message.ContentType,
                message.SequenceNumber,
                message.EnqueuedTime,
                message.ExpiresAt,
                message.DeliveryCount,
                ApplicationProperties = message.ApplicationProperties,
                Body = message.Body.ToString(),
            });
        }
        await receiver.CloseAsync();
    }

    var report = new
    {
        CapturedAtUtc = DateTimeOffset.UtcNow,
        NamespaceEndpoint = endpoint,
        Topic = new
        {
            topic.Name,
            Status = topic.Status.ToString(),
            topic.MaxSizeInMegabytes,
            DefaultMessageTimeToLive = topic.DefaultMessageTimeToLive.ToString(),
            topic.RequiresDuplicateDetection,
            DuplicateDetectionHistoryTimeWindow = topic.DuplicateDetectionHistoryTimeWindow.ToString(),
        },
        ObserverSubscription = subscriptionName,
        Subscriptions = subscriptions,
        PeekedMessages = messages,
    };

    var json = JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true });
    var reportPath = Environment.GetEnvironmentVariable("AZURE_REPORT_PATH");
    if (!string.IsNullOrWhiteSpace(reportPath))
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(reportPath))!);
        await File.WriteAllTextAsync(reportPath, json);
        Console.WriteLine($"Azure evidence report: {Path.GetFullPath(reportPath)}");
    }
    Console.WriteLine(json);
    return 0;
}

if (action == "disable")
{
    if (topic.Status != EntityStatus.Disabled)
    {
        topic.Status = EntityStatus.Disabled;
        await management.UpdateTopicAsync(topic);
    }

    var disabledSubscriptions = 0;
    await foreach (var subscription in management.GetSubscriptionsAsync(topicName))
    {
        if (subscription.Status == EntityStatus.Disabled)
        {
            continue;
        }

        subscription.Status = EntityStatus.Disabled;
        await management.UpdateSubscriptionAsync(subscription);
        disabledSubscriptions++;
    }

    Console.WriteLine($"Disabled topic: {topicName}");
    Console.WriteLine($"Disabled subscriptions: {disabledSubscriptions}");
    return 0;
}

if (action == "observe")
{
    var activeSubscriptions = 0;
    var disabledSubscriptions = 0;
    await foreach (var subscription in management.GetSubscriptionsAsync(topicName))
    {
        if (subscription.Status == EntityStatus.Active) activeSubscriptions++;
        if (subscription.Status == EntityStatus.Disabled) disabledSubscriptions++;
    }

    Console.WriteLine($"Topic: {topicName}");
    Console.WriteLine($"Topic status: {topic.Status}");
    Console.WriteLine($"Active subscriptions: {activeSubscriptions}");
    Console.WriteLine($"Disabled subscriptions: {disabledSubscriptions}");
    if ((await management.SubscriptionExistsAsync(topicName, subscriptionName)).Value)
    {
        var observedRuntime = (await management.GetSubscriptionRuntimePropertiesAsync(topicName, subscriptionName)).Value;
        Console.WriteLine($"Observer active messages: {observedRuntime.ActiveMessageCount}");
    }
    return 0;
}

if (action != "activate")
{
    Console.Error.WriteLine("AZURE_TOPIC_ACTION must be observe, report, activate or disable.");
    return 3;
}

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
