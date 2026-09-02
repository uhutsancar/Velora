using Velora.Shared.Configuration;
using IdentityService.Api.Application.Services;
using IdentityService.Api.Core.Domain;
using Microsoft.EntityFrameworkCore;
using Velora.Shared.Security;

namespace IdentityService.Api.Infrastructure.Context
{
    /// <summary>
    /// Creates the permission catalogue, the three system roles and a bootstrap admin
    /// account. Idempotent: safe to run on every start-up.
    /// </summary>
    public class IdentityContextSeed
    {
        private static readonly string[] AdminPermissions = VeloraPermissions.All.Keys.ToArray();

        private static readonly string[] ManagerPermissions =
        {
            VeloraPermissions.ProductsRead,
            VeloraPermissions.ProductsWrite,
            VeloraPermissions.CategoriesWrite,
            VeloraPermissions.BrandsWrite,
            VeloraPermissions.OrdersRead,
            VeloraPermissions.OrdersWrite,
            VeloraPermissions.CouponsWrite,
            VeloraPermissions.CampaignsWrite,
            VeloraPermissions.AnalyticsRead
        };

        private static readonly string[] CustomerPermissions = { VeloraPermissions.ProductsRead };

        /// <summary>
        /// Gelistirmede, yapilandirmada parola yokken kullanilir. Deger kodda
        /// DEGIL ortam degiskeninde durur (VELORA_SEED_ADMIN_PASSWORD): bu depo
        /// herkese acik ve buraya yazilan her parola yayinlanmis sayilir.
        /// </summary>
        private static string? DevelopmentAdminPassword => LocalDevSecrets.SeedAdminPassword;

        public async Task SeedAsync(
            IdentityDbContext context,
            IConfiguration configuration,
            IHostEnvironment environment,
            IPasswordHasher hasher,
            ILogger logger)
        {
            await SeedPermissions(context);
            var roles = await SeedRoles(context);
            await SeedRolePermissions(context, roles);
            await SeedAdminUser(context, configuration, environment, hasher, roles, logger);
        }

        private static async Task SeedPermissions(IdentityDbContext context)
        {
            var existing = await context.Permissions.Select(p => p.Code).ToListAsync();
            var missing = VeloraPermissions.All
                .Where(kv => !existing.Contains(kv.Key))
                .Select(kv => new Permission { Code = kv.Key, Description = kv.Value })
                .ToList();

            if (missing.Count == 0) return;

            context.Permissions.AddRange(missing);
            await context.SaveChangesAsync();
        }

        private static async Task<Dictionary<string, Role>> SeedRoles(IdentityDbContext context)
        {
            var definitions = new (string Name, string Description)[]
            {
                (VeloraRoles.Admin, "Full access to the Velora back office"),
                (VeloraRoles.Manager, "Manages catalogue and orders"),
                (VeloraRoles.Customer, "Storefront shopper")
            };

            var existing = await context.Roles.ToDictionaryAsync(r => r.Name);

            foreach (var (name, description) in definitions)
            {
                if (existing.ContainsKey(name)) continue;

                var role = new Role { Name = name, Description = description, IsSystemRole = true };
                context.Roles.Add(role);
                existing[name] = role;
            }

            await context.SaveChangesAsync();
            return existing;
        }

        private static async Task SeedRolePermissions(IdentityDbContext context, Dictionary<string, Role> roles)
        {
            var permissionsByCode = await context.Permissions.ToDictionaryAsync(p => p.Code);
            var existingSet = (await context.RolePermissions
                    .Select(rp => new { rp.RoleId, rp.PermissionId })
                    .ToListAsync())
                .Select(e => (e.RoleId, e.PermissionId))
                .ToHashSet();

            void Grant(string roleName, IEnumerable<string> codes)
            {
                if (!roles.TryGetValue(roleName, out var role)) return;

                foreach (var code in codes)
                {
                    if (!permissionsByCode.TryGetValue(code, out var permission)) continue;
                    if (!existingSet.Add((role.Id, permission.Id))) continue;

                    context.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = permission.Id });
                }
            }

            Grant(VeloraRoles.Admin, AdminPermissions);
            Grant(VeloraRoles.Manager, ManagerPermissions);
            Grant(VeloraRoles.Customer, CustomerPermissions);

            await context.SaveChangesAsync();
        }

        private static async Task SeedAdminUser(
            IdentityDbContext context,
            IConfiguration configuration,
            IHostEnvironment environment,
            IPasswordHasher hasher,
            Dictionary<string, Role> roles,
            ILogger logger)
        {
            var email = (configuration["SeedAdmin:Email"] ?? "admin@velora.com").ToLowerInvariant();
            var password = configuration["SeedAdmin:Password"];

            if (string.IsNullOrWhiteSpace(password))
            {
                if (!environment.IsDevelopment())
                {
                    // A known default admin password must never exist outside a local machine.
                    logger.LogWarning(
                        "SeedAdmin:Password is not configured, so no bootstrap admin was created. " +
                        "Set SeedAdmin__Password and restart, or create the account manually.");
                    return;
                }

                password = DevelopmentAdminPassword;
            }

            if (await context.Users.AnyAsync(u => u.Email == email))
                return;

            var admin = new User
            {
                Email = email,
                UserName = "admin",
                FirstName = "Velora",
                LastName = "Admin",
                PasswordHash = hasher.Hash(password),
                IsActive = true,
                EmailConfirmed = true
            };

            admin.UserRoles.Add(new UserRole { RoleId = roles[VeloraRoles.Admin].Id });

            context.Users.Add(admin);
            await context.SaveChangesAsync();

            logger.LogInformation("Seeded bootstrap admin account {Email}. Change the password before going live.", email);
        }
    }
}
