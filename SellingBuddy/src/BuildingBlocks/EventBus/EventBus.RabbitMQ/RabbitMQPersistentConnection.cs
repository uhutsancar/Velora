using Polly;
using RabbitMQ.Client;
using RabbitMQ.Client.Exceptions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;

namespace EventBus.RabbitMQ
{
    public class RabbitMQPersistentConnection : IDisposable
    {

        private readonly IConnectionFactory connectionFactory;
        private readonly int retryCount;
        private IConnection? connection;
        private object lock_object = new object();


        public RabbitMQPersistentConnection(IConnectionFactory connectionFactory, int retryCount = 5)
        {
            this.connectionFactory = connectionFactory;
            this.retryCount = retryCount > 0 ? retryCount : 5;
        }

        public bool IsConnected => connection != null && connection.IsOpen;

        public IModel CreateModel()
        {
            if (!IsConnected)
                throw new InvalidOperationException("RabbitMQ connection is not open.");

            return connection!.CreateModel();
        }

        public void Dispose()
        {
            connection?.Dispose();
        }



        public bool TryConnect()
        {
            lock (lock_object)
            {
                var policy = Policy.Handle<SocketException>()
                    .Or<BrokerUnreachableException>()
                    .WaitAndRetry(retryCount, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)), (ex, time) =>
                    {
                    }
                );

                policy.Execute(() =>
                {
                    connection = connectionFactory.CreateConnection();
                });
                return IsConnected;
            }
        }
    }
}
