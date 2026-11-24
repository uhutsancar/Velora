using EventBus.Base.Events;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EventBus.UnitTest.Events.Events
{
    public class OrderCreatedIntegrationEvent: IntegrationEvent
    {
        public int TestMessageId { get; set; }

        public OrderCreatedIntegrationEvent(int testMessageId)
        {
            TestMessageId = testMessageId;
        }
    }
}
