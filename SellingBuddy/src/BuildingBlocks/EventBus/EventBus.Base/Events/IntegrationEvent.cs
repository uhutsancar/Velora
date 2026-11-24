using System.Text.Json.Serialization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EventBus.Base.Events
{
    public class IntegrationEvent
    {
        [JsonPropertyName("id")]
        public Guid Id { get; private set; }

        [JsonPropertyName("createdDate")]
        public DateTime CreatedDate { get; private set; }

        [JsonPropertyName("schemaVersion")]
        public int SchemaVersion { get; private set; } = 1;

        [JsonPropertyName("correlationId")]
        public Guid CorrelationId { get; private set; }

        [JsonPropertyName("causationId")]
        public Guid? CausationId { get; private set; }


        public IntegrationEvent()
        {
            Id = Guid.NewGuid();
            CreatedDate = DateTime.UtcNow;
            CorrelationId = Id;
        }



        [JsonConstructor]
        public IntegrationEvent(Guid id, DateTime createdDate)
        {
            Id = id;
            CreatedDate = createdDate.Kind == DateTimeKind.Utc ? createdDate : createdDate.ToUniversalTime();
            CorrelationId = id;
        }

        public void SetContext(Guid correlationId, Guid? causationId = null)
        {
            CorrelationId = correlationId == Guid.Empty ? Id : correlationId;
            CausationId = causationId;
        }
    }
}
