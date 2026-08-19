using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderService.Domain.AggregateModels.BuyerAggregate;
using OrderService.Domain.AggregateModels.OrderAggregate;
using OrderService.Domain.SeedWork;
using OrderService.Infrastructure.EntityConfigurations;
using OrderService.Infrastructure.Extensions;

namespace OrderService.Infrastructure.Context
{
    public class OrderDbContext : DbContext, IUnitOfWork
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
        public DbSet<PaymentMethod> Payments { get; set; } = default!;
        public DbSet<Buyer> Buyers { get; set; } = default!;
        public DbSet<CardType> CardTypes { get; set; } = default!;
        public DbSet<OrderStatus> OrderStatus { get; set; } = default!;

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
            modelBuilder.ApplyConfiguration(new BuyerEntityConfiguration());
            modelBuilder.ApplyConfiguration(new OrderStatusEntityConfiguration());
            modelBuilder.ApplyConfiguration(new PaymentMethodEntityConfiguration());
            modelBuilder.ApplyConfiguration(new CardTypeEntityConfiguration());
        }
    }
}
