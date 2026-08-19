using IdentityService.Api.Application.Models;
using IdentityService.Api.Application.Services;
using IdentityService.Api.Core.Domain;
using IdentityService.Api.Infrastructure.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Velora.Shared.Contracts;
using Velora.Shared.Security;

namespace IdentityService.Api.Controllers
{
    /// <summary>
    /// Back-office user management. Guarded by permission policies, not by role checks
    /// in the UI: hiding a button in the admin app is not authorization.
    /// </summary>
    [Route("api/users")]
    [ApiController]
    [Authorize(Policy = VeloraPolicies.UsersRead)]
    public class UsersController : ControllerBase
    {
        private readonly IdentityDbContext db;
        private readonly IPasswordHasher passwordHasher;

        public UsersController(IdentityDbContext db, IPasswordHasher passwordHasher)
        {
            this.db = db;
            this.passwordHasher = passwordHasher;
        }

        [HttpGet]
        public async Task<PagedResult<AdminUserListItemModel>> List(
            [FromQuery] string? search,
            [FromQuery] string? role,
            [FromQuery] bool? isActive,
            [FromQuery] int pageIndex = 0,
            [FromQuery] int pageSize = 20,
            CancellationToken ct = default)
        {
            pageSize = Math.Clamp(pageSize, 1, 100);
            pageIndex = Math.Max(pageIndex, 0);

            var query = db.Users.AsNoTracking()
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(u =>
                    u.Email.ToLower().Contains(term) ||
                    u.FirstName.ToLower().Contains(term) ||
                    u.LastName.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(role))
                query = query.Where(u => u.UserRoles.Any(ur => ur.Role.Name == role));

            if (isActive.HasValue)
                query = query.Where(u => u.IsActive == isActive.Value);

            var total = await query.LongCountAsync(ct);

            var rows = await query
                .OrderByDescending(u => u.CreatedAtUtc)
                .Skip(pageIndex * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            return new PagedResult<AdminUserListItemModel>(rows.Select(MapListItem).ToList(), pageIndex, pageSize, total);
        }

        [HttpGet("stats")]
        public async Task<UserStatsModel> Stats(CancellationToken ct)
        {
            var since = DateTime.UtcNow.AddDays(-30);

            return new UserStatsModel
            {
                TotalUsers = await db.Users.CountAsync(ct),
                ActiveUsers = await db.Users.CountAsync(u => u.IsActive, ct),
                NewUsersLast30Days = await db.Users.CountAsync(u => u.CreatedAtUtc >= since, ct),
                AdminUsers = await db.Users.CountAsync(u => u.UserRoles.Any(ur => ur.Role.Name == VeloraRoles.Admin), ct)
            };
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<UserProfileModel>> GetById(Guid id, CancellationToken ct)
        {
            var user = await UsersWithGraph().FirstOrDefaultAsync(u => u.Id == id, ct);
            return user is null ? NotFound() : IdentityService.Api.Application.Services.IdentityService.ToProfile(user);
        }

        [HttpPut("{id:guid}/status")]
        [Authorize(Policy = VeloraPolicies.UsersWrite)]
        public async Task<IActionResult> SetStatus(Guid id, [FromBody] UpdateUserStatusRequestModel model, CancellationToken ct)
        {
            var user = await db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == id, ct);

            if (user is null) return NotFound();

            if (!model.IsActive && user.Id == User.GetUserId())
                return BadRequest(new { message = "You cannot disable your own account." });

            if (!model.IsActive && await IsLastActiveAdmin(user, ct))
                return BadRequest(new { message = "The last active administrator cannot be disabled." });

            user.IsActive = model.IsActive;
            user.UpdatedAtUtc = DateTime.UtcNow;

            if (!model.IsActive)
            {
                var now = DateTime.UtcNow;
                await db.RefreshTokens
                    .Where(t => t.UserId == id && t.RevokedAtUtc == null)
                    .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAtUtc, now), ct);
            }

            await db.SaveChangesAsync(ct);
            return NoContent();
        }

        [HttpPut("{id:guid}/roles")]
        [Authorize(Policy = VeloraPolicies.UsersWrite)]
        public async Task<ActionResult<UserProfileModel>> SetRoles(Guid id, [FromBody] UpdateUserRolesRequestModel model, CancellationToken ct)
        {
            var user = await UsersWithGraph().FirstOrDefaultAsync(u => u.Id == id, ct);
            if (user is null) return NotFound();

            var requested = model.Roles.Distinct().ToList();
            var roles = await db.Roles.Where(r => requested.Contains(r.Name)).ToListAsync(ct);

            if (roles.Count != requested.Count)
                return BadRequest(new { message = "One or more roles do not exist." });

            var losesAdmin = user.UserRoles.Any(ur => ur.Role.Name == VeloraRoles.Admin) &&
                             !requested.Contains(VeloraRoles.Admin);

            if (losesAdmin && await IsLastActiveAdmin(user, ct))
                return BadRequest(new { message = "The last administrator cannot lose the Admin role." });

            db.UserRoles.RemoveRange(user.UserRoles);
            foreach (var role in roles)
                db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });

            user.UpdatedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);

            var reloaded = await UsersWithGraph().FirstAsync(u => u.Id == id, ct);
            return IdentityService.Api.Application.Services.IdentityService.ToProfile(reloaded);
        }

        [HttpPost("{id:guid}/reset-password")]
        [Authorize(Policy = VeloraPolicies.UsersWrite)]
        public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordRequestModel model, CancellationToken ct)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
            if (user is null) return NotFound();

            user.PasswordHash = passwordHasher.Hash(model.NewPassword);
            user.UpdatedAtUtc = DateTime.UtcNow;

            var now = DateTime.UtcNow;
            await db.RefreshTokens
                .Where(t => t.UserId == id && t.RevokedAtUtc == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAtUtc, now), ct);

            await db.SaveChangesAsync(ct);
            return NoContent();
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Policy = VeloraPolicies.UsersWrite)]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            var user = await db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == id, ct);

            if (user is null) return NotFound();

            if (user.Id == User.GetUserId())
                return BadRequest(new { message = "You cannot delete your own account." });

            if (await IsLastActiveAdmin(user, ct))
                return BadRequest(new { message = "The last administrator cannot be deleted." });

            db.Users.Remove(user);
            await db.SaveChangesAsync(ct);

            return NoContent();
        }

        private IQueryable<User> UsersWithGraph() =>
            db.Users.AsNoTracking()
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission);

        private async Task<bool> IsLastActiveAdmin(User user, CancellationToken ct)
        {
            if (!user.UserRoles.Any(ur => ur.Role.Name == VeloraRoles.Admin))
                return false;

            var otherAdmins = await db.Users
                .CountAsync(u => u.Id != user.Id && u.IsActive && u.UserRoles.Any(ur => ur.Role.Name == VeloraRoles.Admin), ct);

            return otherAdmins == 0;
        }

        private static AdminUserListItemModel MapListItem(User u) => new()
        {
            Id = u.Id,
            Email = u.Email,
            FullName = u.FullName,
            PhoneNumber = u.PhoneNumber,
            IsActive = u.IsActive,
            CreatedAtUtc = u.CreatedAtUtc,
            LastLoginAtUtc = u.LastLoginAtUtc,
            Roles = u.UserRoles.Select(ur => ur.Role.Name).ToArray()
        };
    }

    /// <summary>Roles and permissions reference data for the admin UI.</summary>
    [Route("api/roles")]
    [ApiController]
    [Authorize(Policy = VeloraPolicies.UsersRead)]
    public class RolesController : ControllerBase
    {
        private readonly IdentityDbContext db;

        public RolesController(IdentityDbContext db) => this.db = db;

        [HttpGet]
        public async Task<IReadOnlyCollection<RoleModel>> List(CancellationToken ct)
        {
            var roles = await db.Roles.AsNoTracking()
                .Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
                .OrderBy(r => r.Name)
                .ToListAsync(ct);

            return roles.Select(r => new RoleModel
            {
                Id = r.Id,
                Name = r.Name,
                Description = r.Description,
                IsSystemRole = r.IsSystemRole,
                Permissions = r.RolePermissions.Select(rp => rp.Permission.Code).OrderBy(c => c).ToArray()
            }).ToList();
        }

        [HttpGet("permissions")]
        public async Task<IReadOnlyCollection<PermissionModel>> Permissions(CancellationToken ct)
        {
            var permissions = await db.Permissions.AsNoTracking().OrderBy(p => p.Code).ToListAsync(ct);

            return permissions.Select(p => new PermissionModel { Code = p.Code, Description = p.Description }).ToList();
        }
    }
}
