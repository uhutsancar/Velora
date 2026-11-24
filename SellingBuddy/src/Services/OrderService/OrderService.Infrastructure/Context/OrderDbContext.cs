using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderService.Domain.AggregateModels.OrderAggregate;
using OrderService.Domain.SeedWork;
using OrderService.Infrastructure.EntityConfigurations;
using OrderService.Infrastructure.Extensions;
using OrderService.Application.Interfaces.Repositories;
using EventBus.Base.Events;
using Newtonsoft.Json;

namespace OrderService.Infrastructure.Context
{
    public class OrderDbContext : DbContext, IUnitOfWork, IIntegrationEventOutbox
    {
        public const string DEFAULT_SCHEMA = "ordering";

        private readonly IMediator? mediator;

        public OrderDbContext(DbContextOptions<OrderDbContext> options) : base(options)
        {
        }

        public OrderDbContext(DbContextOptions<OrderDbContext> options, IMediator? mediator) : base(options)
        {
            this.mediator = mediator;
        }

        public DbSet<Order> Orders { get; set; } = default!;
        public DbSet<OrderItem> OrderItems { get; set; } = default!;
        public DbSet<OrderStatus> OrderStatus { get; set; } = default!;
        public DbSet<OutboxMessage> OutboxMessages { get; set; } = default!;

        public void Enqueue(IntegrationEvent integrationEvent)
        {
            OutboxMessages.Add(new OutboxMessage
            {
                Id = integrationEvent.Id,
                OccurredAtUtc = integrationEvent.CreatedDate,
                EventType = integrationEvent.GetType().AssemblyQualifiedName
                    ?? throw new InvalidOperationException("Integration event type has no assembly-qualified name."),
                Payload = JsonConvert.SerializeObject(integrationEvent)
            });
        }

        /// <summary>
        /// Commits the unit of work and dispatches the domain events raised by the
        /// aggregates that took part in it.
        /// </summary>
        public async Task<bool> SaveEntitiesAsync(CancellationToken cancellationToken = default)
        {
            if (mediator is not null)
                await mediator.DispatchDomainEventsAsync(this);

            await base.SaveChangesAsync(cancellationToken);

            return true;
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.ApplyConfiguration(new OrderEntityConfiguration());
            modelBuilder.ApplyConfiguration(new OrderItemEntityConfiguration());
            modelBuilder.ApplyConfiguration(new OrderStatusEntityConfiguration());

            modelBuilder.Entity<OutboxMessage>(message =>
            {
                message.ToTable("outbox_messages", DEFAULT_SCHEMA);
                message.HasKey(item => item.Id);
                message.HasIndex(item => new { item.ProcessedAtUtc, item.OccurredAtUtc });
                message.Property(item => item.EventType).IsRequired().HasMaxLength(1000);
                message.Property(item => item.Payload).IsRequired();
                message.Property(item => item.LastError).HasMaxLength(2000);
            });
        }
    }
}
