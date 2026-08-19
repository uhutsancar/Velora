using Microsoft.EntityFrameworkCore;
using OrderService.Application.Interfaces.Repositories;
using OrderService.Domain.SeedWork;
using OrderService.Infrastructure.Context;
using System.Linq.Expressions;

namespace OrderService.Infrastructure.Repositories
{
    public class GenericRepository<T> : IGenericRepository<T> where T : BaseEntity
    {
        protected readonly OrderDbContext DbContext;

        public GenericRepository(OrderDbContext dbContext)
        {
            DbContext = dbContext;
        }

        /// <summary>
        /// The DbContext is the unit of work. Handlers call
        /// <c>repository.UnitOfWork.SaveEntitiesAsync()</c> to commit and dispatch domain events.
        /// </summary>
        public IUnitOfWork UnitOfWork => DbContext;

        public virtual async Task<T> AddAsync(T entity)
        {
            await DbContext.Set<T>().AddAsync(entity);
            return entity;
        }

        public virtual async Task<List<T>> Get(Expression<Func<T, bool>>? filter = null, params Expression<Func<T, object>>[] includes)
        {
            IQueryable<T> query = DbContext.Set<T>();

            foreach (var include in includes)
                query = query.Include(include);

            if (filter is not null)
                query = query.Where(filter);

            return await query.ToListAsync();
        }

        public virtual async Task<List<T>> Get(
            Expression<Func<T, bool>>? filter = null,
            Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
            string includeProperties = "")
        {
            IQueryable<T> query = DbContext.Set<T>();

            if (filter is not null)
                query = query.Where(filter);

            foreach (var includeProperty in includeProperties.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                query = query.Include(includeProperty);

            if (orderBy is not null)
                query = orderBy(query);

            return await query.ToListAsync();
        }

        public virtual Task<List<T>> GetAll() => DbContext.Set<T>().ToListAsync();

        public virtual async Task<T?> GetById(Guid id) => await DbContext.Set<T>().FindAsync(id);

        public virtual async Task<T?> GetByIdAsync(Guid id, params Expression<Func<T, object>>[] includes)
        {
            IQueryable<T> query = DbContext.Set<T>();

            foreach (var include in includes)
                query = query.Include(include);

            return await query.FirstOrDefaultAsync(i => i.Id == id);
        }

        public virtual async Task<T?> GetSingleAsync(Expression<Func<T, bool>> expression, params Expression<Func<T, object>>[] includes)
        {
            IQueryable<T> query = DbContext.Set<T>();

            foreach (var include in includes)
                query = query.Include(include);

            return await query.Where(expression).SingleOrDefaultAsync();
        }

        public virtual T Update(T entity)
        {
            DbContext.Set<T>().Update(entity);
            return entity;
        }

        public virtual void Delete(T entity) => DbContext.Set<T>().Remove(entity);
    }
}
