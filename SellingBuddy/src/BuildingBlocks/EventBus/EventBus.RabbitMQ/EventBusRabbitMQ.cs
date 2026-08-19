using EventBus.Base;
using EventBus.Base.Events;
using Newtonsoft.Json;
using Polly;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using RabbitMQ.Client.Exceptions;
using System;
using System.Net.Sockets;
using System.Text;

namespace EventBus.RabbitMQ
{
    public class EventBusRabbitMQ : BaseEventBus
    {
        private const string DeadLetterExchangeSuffix = ".dlx";

        private readonly RabbitMQPersistentConnection persistentConnection;
        private readonly IConnectionFactory connectionFactory;

        /// <summary>Channel used exclusively for consuming (RabbitMQ IModel is not thread-safe).</summary>
        private IModel consumerChannel;

        /// <summary>Dedicated publish channel guarded by <see cref="publishLock"/>.</summary>
        private readonly IModel publisherChannel;
        private readonly object publishLock = new();

        public EventBusRabbitMQ(EventBusConfig config, IServiceProvider serviceProvider) : base(config, serviceProvider)
        {
            connectionFactory = config.Connection as IConnectionFactory ?? new ConnectionFactory();

            persistentConnection = new RabbitMQPersistentConnection(connectionFactory, config.ConnectionRetryCount);

            consumerChannel = CreateChannel();
            publisherChannel = CreateChannel();

            SubsManager.OnEventRemoved += SubsManager_OnEventRemoved;
        }

        private string DeadLetterExchangeName => EventBusConfig.DefaultTopicName + DeadLetterExchangeSuffix;

        private IModel CreateChannel()
        {
            if (!persistentConnection.IsConnected)
                persistentConnection.TryConnect();

            var channel = persistentConnection.CreateModel();

            channel.ExchangeDeclare(exchange: EventBusConfig.DefaultTopicName, type: "direct", durable: true);
            channel.ExchangeDeclare(exchange: DeadLetterExchangeName, type: "direct", durable: true);

            return channel;
        }

        private void SubsManager_OnEventRemoved(object? sender, string eventName)
        {
            eventName = ProcessEventName(eventName);

            if (!persistentConnection.IsConnected)
                persistentConnection.TryConnect();

            consumerChannel.QueueUnbind(queue: GetSubName(eventName),
                exchange: EventBusConfig.DefaultTopicName,
                routingKey: eventName);

            if (SubsManager.IsEmpty)
                consumerChannel.Close();
        }

        public override void Publish(IntegrationEvent @event)
        {
            if (!persistentConnection.IsConnected)
                persistentConnection.TryConnect();

            var policy = Policy.Handle<BrokerUnreachableException>()
                .Or<SocketException>()
                .WaitAndRetry(EventBusConfig.ConnectionRetryCount,
                    retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));

            var eventName = ProcessEventName(@event.GetType().Name);

            var message = JsonConvert.SerializeObject(@event);
            var body = Encoding.UTF8.GetBytes(message);

            policy.Execute(() =>
            {
                lock (publishLock)
                {
                    var properties = publisherChannel.CreateBasicProperties();
                    properties.DeliveryMode = 2; // persistent
                    properties.MessageId = @event.Id.ToString();
                    properties.ContentType = "application/json";

                    publisherChannel.BasicPublish(
                        exchange: EventBusConfig.DefaultTopicName,
                        routingKey: eventName,
                        mandatory: false,
                        basicProperties: properties,
                        body: body);
                }
            });
        }

        public override void Subscribe<T, TH>()
        {
            var eventName = ProcessEventName(typeof(T).Name);

            if (SubsManager.HasSubscriptionsForEvent(eventName))
            {
                // Another handler for the same event: register it, the consumer is already running.
                SubsManager.AddSubscription<T, TH>();
                return;
            }

            if (!persistentConnection.IsConnected)
                persistentConnection.TryConnect();

            var queueName = GetSubName(eventName);

            DeclareSubscriberQueue(queueName, eventName);

            consumerChannel.QueueBind(queue: queueName,
                exchange: EventBusConfig.DefaultTopicName,
                routingKey: eventName);

            SubsManager.AddSubscription<T, TH>();
            StartBasicConsume(eventName);
        }

        public override void UnSubscribe<T, TH>()
        {
            SubsManager.RemoveSubscription<T, TH>();
        }

        /// <summary>
        /// Declares the subscriber queue with a dead-letter policy.
        ///
        /// RabbitMQ rejects a re-declare whose arguments differ from the existing
        /// queue (406 PRECONDITION_FAILED), which is exactly what happens on an
        /// upgrade from a build that had no DLQ. Rather than crash the service on
        /// start-up, fall back to the existing definition and tell the operator how
        /// to enable dead-lettering.
        /// </summary>
        private void DeclareSubscriberQueue(string queueName, string eventName)
        {
            var deadLetterQueueName = queueName + DeadLetterExchangeSuffix;

            try
            {
                consumerChannel.QueueDeclare(
                    queue: deadLetterQueueName,
                    durable: true,
                    exclusive: false,
                    autoDelete: false,
                    arguments: null);

                consumerChannel.QueueBind(
                    queue: deadLetterQueueName,
                    exchange: DeadLetterExchangeName,
                    routingKey: eventName);

                consumerChannel.QueueDeclare(
                    queue: queueName,
                    durable: true,
                    exclusive: false,
                    autoDelete: false,
                    arguments: new Dictionary<string, object>
                    {
                        ["x-dead-letter-exchange"] = DeadLetterExchangeName,
                        ["x-dead-letter-routing-key"] = eventName
                    });
            }
            catch (OperationInterruptedException ex) when (ex.ShutdownReason?.ReplyCode == 406)
            {
                Console.Error.WriteLine(
                    $"[EventBus] Queue '{queueName}' already exists without a dead-letter policy. " +
                    "Continuing without dead-lettering; delete the queue in the RabbitMQ console to enable it.");

                // The 406 closed the channel, so a fresh one is required.
                consumerChannel = CreateChannel();

                consumerChannel.QueueDeclare(
                    queue: queueName,
                    durable: true,
                    exclusive: false,
                    autoDelete: false,
                    arguments: null);
            }
        }

        private void StartBasicConsume(string eventName)
        {
            if (consumerChannel == null) return;

            var consumer = new EventingBasicConsumer(consumerChannel);
            consumer.Received += Consumer_Received;

            consumerChannel.BasicConsume(
                queue: GetSubName(eventName),
                autoAck: false,
                consumer: consumer);
        }

        private void Consumer_Received(object? sender, BasicDeliverEventArgs eventArgs)
        {
            var eventName = ProcessEventName(eventArgs.RoutingKey);
            var message = Encoding.UTF8.GetString(eventArgs.Body.Span);

            try
            {
                // The RabbitMQ dispatcher thread is synchronous; blocking here preserves
                // ordering per consumer and guarantees ack/nack happens exactly once.
                ProcessEvent(eventName, message).GetAwaiter().GetResult();
                consumerChannel.BasicAck(eventArgs.DeliveryTag, multiple: false);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[EventBus] Handling '{eventName}' failed, routed to dead-letter queue: {ex.Message}");

                // requeue:false -> the broker routes the message to the configured dead-letter exchange.
                consumerChannel.BasicNack(eventArgs.DeliveryTag, multiple: false, requeue: false);
            }
        }

        public override void Dispose()
        {
            SubsManager.OnEventRemoved -= SubsManager_OnEventRemoved;

            if (consumerChannel?.IsOpen == true) consumerChannel.Close();
            if (publisherChannel?.IsOpen == true) publisherChannel.Close();

            persistentConnection.Dispose();

            base.Dispose();
        }
    }
}
