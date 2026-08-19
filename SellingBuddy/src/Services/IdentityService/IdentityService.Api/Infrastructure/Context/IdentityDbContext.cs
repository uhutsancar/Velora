using IdentityService.Api.Core.Domain;
using Microsoft.EntityFrameworkCore;
using System.Reflection;

namespace IdentityService.Api.Infrastructure.Context
{
    public class IdentityDbContext : DbContext
    {
        public const string DEFAULT_SCHEMA = "identity";

        public IdentityDbContext(DbContextOptions<IdentityDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<Role> Roles => Set<Role>();
        public DbSet<Permission> Permissions => Set<Permission>();
        public DbSet<UserRole> UserRoles => Set<UserRole>();
        public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
        public DbSet<UserAddress> UserAddresses => Set<UserAddress>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            builder.HasDefaultSchema(DEFAULT_SCHEMA);
            builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        }
    }
}
