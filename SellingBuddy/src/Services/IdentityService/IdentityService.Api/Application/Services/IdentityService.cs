using IdentityService.Api.Application.Models;
using IdentityService.Api.Core.Domain;
using IdentityService.Api.Infrastructure.Context;
using Velora.Shared.Security;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Api.Application.Services
{
    public sealed class IdentityService : IIdentityService
    {
        private const int MaxFailedAttempts = 5;
        private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

        private readonly IdentityDbContext db;
        private readonly IPasswordHasher passwordHasher;
        private readonly ITokenService tokenService;
        private readonly ILogger<IdentityService> logger;

        public IdentityService(
            IdentityDbContext db,
            IPasswordHasher passwordHasher,
            ITokenService tokenService,
            ILogger<IdentityService> logger)
        {
            this.db = db;
            this.passwordHasher = passwordHasher;
            this.tokenService = tokenService;
            this.logger = logger;
        }

        public async Task<LoginResponseModel> Login(LoginRequestModel requestModel, string? ipAddress = null, CancellationToken ct = default)
        {
            var identifier = requestModel.UserName.Trim().ToLowerInvariant();

            var user = await UsersWithRoles()
                .FirstOrDefaultAsync(u => u.Email.ToLower() == identifier || u.UserName.ToLower() == identifier, ct);

            // Same generic message for "no such user" and "wrong password": no account enumeration.
            if (user is null)
                throw new IdentityException("Invalid credentials.", 401);

            if (user.LockoutEndUtc is { } lockoutEnd && lockoutEnd > DateTime.UtcNow)
                throw new IdentityException("Account is temporarily locked. Please try again later.", 423);

            if (!passwordHasher.Verify(requestModel.Password, user.PasswordHash))
            {
                user.AccessFailedCount++;
                if (user.AccessFailedCount >= MaxFailedAttempts)
                {
                    user.LockoutEndUtc = DateTime.UtcNow.Add(LockoutDuration);
                    user.AccessFailedCount = 0;
                    logger.LogWarning("User {UserId} locked out after repeated failed logins.", user.Id);
                }

                await db.SaveChangesAsync(ct);
                throw new IdentityException("Invalid credentials.", 401);
            }

            if (!user.IsActive)
                throw new IdentityException("This account has been disabled.", 403);

            user.AccessFailedCount = 0;
            user.LockoutEndUtc = null;
            user.LastLoginAtUtc = DateTime.UtcNow;

            return await IssueTokens(user, ipAddress, ct);
        }

        public async Task<LoginResponseModel> Register(RegisterRequestModel requestModel, string? ipAddress = null, CancellationToken ct = default)
        {
            var email = requestModel.Email.Trim().ToLowerInvariant();

            if (await db.Users.AnyAsync(u => u.Email.ToLower() == email, ct))
                throw new IdentityException("An account with this email already exists.", 409);

            var customerRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == VeloraRoles.Customer, ct)
                               ?? throw new IdentityException("Customer role is not configured.", 500);

            var user = new User
            {
                Email = email,
                UserName = await BuildUniqueUserName(email, ct),
                FirstName = requestModel.FirstName.Trim(),
                LastName = requestModel.LastName.Trim(),
                PhoneNumber = requestModel.PhoneNumber?.Trim(),
                PasswordHash = passwordHasher.Hash(requestModel.Password),
                IsActive = true,
                LastLoginAtUtc = DateTime.UtcNow
            };

            user.UserRoles.Add(new UserRole { RoleId = customerRole.Id });

            db.Users.Add(user);
            await db.SaveChangesAsync(ct);

            // Reload with the role graph so the freshly issued token carries the claims.
            var created = await UsersWithRoles().FirstAsync(u => u.Id == user.Id, ct);

            return await IssueTokens(created, ipAddress, ct);
        }

        public async Task<LoginResponseModel> Refresh(string refreshToken, string? ipAddress = null, CancellationToken ct = default)
        {
            var hash = tokenService.HashRefreshToken(refreshToken);

            var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct)
                         ?? throw new IdentityException("Invalid refresh token.", 401);

            if (stored.RevokedAtUtc is not null)
            {
                // Reuse of an already rotated token: assume theft and drop the whole family.
                logger.LogWarning("Refresh token reuse detected for user {UserId}.", stored.UserId);
                await RevokeAllTokensFor(stored.UserId, ct);
                throw new IdentityException("Invalid refresh token.", 401);
            }

            if (stored.ExpiresAtUtc <= DateTime.UtcNow)
                throw new IdentityException("Refresh token has expired.", 401);

            var user = await UsersWithRoles().FirstOrDefaultAsync(u => u.Id == stored.UserId, ct)
                       ?? throw new IdentityException("Invalid refresh token.", 401);

            if (!user.IsActive)
                throw new IdentityException("This account has been disabled.", 403);

            return await IssueTokens(user, ipAddress, ct, rotated: stored);
        }

        public async Task Logout(string refreshToken, CancellationToken ct = default)
        {
            var hash = tokenService.HashRefreshToken(refreshToken);
            var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

            if (stored is null || stored.RevokedAtUtc is not null)
                return;

            stored.RevokedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }

        public async Task<UserProfileModel> GetProfile(Guid userId, CancellationToken ct = default)
        {
            var user = await UsersWithRoles().FirstOrDefaultAsync(u => u.Id == userId, ct)
                       ?? throw new IdentityException("User not found.", 404);

            return ToProfile(user);
        }

        public async Task<UserProfileModel> UpdateProfile(Guid userId, UpdateProfileRequestModel model, CancellationToken ct = default)
        {
            var user = await UsersWithRoles().FirstOrDefaultAsync(u => u.Id == userId, ct)
                       ?? throw new IdentityException("User not found.", 404);

            user.FirstName = model.FirstName.Trim();
            user.LastName = model.LastName.Trim();
            user.PhoneNumber = model.PhoneNumber?.Trim();
            user.UpdatedAtUtc = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);

            return ToProfile(user);
        }

        public async Task ChangePassword(Guid userId, ChangePasswordRequestModel model, CancellationToken ct = default)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
                       ?? throw new IdentityException("User not found.", 404);

            if (!passwordHasher.Verify(model.CurrentPassword, user.PasswordHash))
                throw new IdentityException("Current password is incorrect.", 400);

            user.PasswordHash = passwordHasher.Hash(model.NewPassword);
            user.UpdatedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);

            // Changing the password invalidates every existing session.
            await RevokeAllTokensFor(userId, ct);
        }

        private IQueryable<User> UsersWithRoles() =>
            db.Users
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission);

        private async Task<LoginResponseModel> IssueTokens(User user, string? ipAddress, CancellationToken ct, RefreshToken? rotated = null)
        {
            var roles = user.UserRoles.Select(ur => ur.Role.Name).Distinct().ToArray();
            var permissions = user.UserRoles
                .SelectMany(ur => ur.Role.RolePermissions)
                .Select(rp => rp.Permission.Code)
                .Distinct()
                .ToArray();

            var access = tokenService.CreateAccessToken(user, roles, permissions);
            var refresh = tokenService.CreateRefreshToken(user.Id, ipAddress);

            db.RefreshTokens.Add(refresh.Entity);

            if (rotated is not null)
            {
                rotated.RevokedAtUtc = DateTime.UtcNow;
                rotated.ReplacedByTokenId = refresh.Entity.Id;
            }

            await db.SaveChangesAsync(ct);

            return new LoginResponseModel
            {
                UserName = user.UserName,
                UserToken = access.Value,
                AccessToken = access.Value,
                RefreshToken = refresh.RawValue,
                ExpiresAtUtc = access.ExpiresAtUtc,
                User = ToProfile(user, roles, permissions)
            };
        }

        private async Task RevokeAllTokensFor(Guid userId, CancellationToken ct)
        {
            var now = DateTime.UtcNow;

            await db.RefreshTokens
                .Where(t => t.UserId == userId && t.RevokedAtUtc == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAtUtc, now), ct);
        }

        private async Task<string> BuildUniqueUserName(string email, CancellationToken ct)
        {
            var baseName = email.Split('@')[0];
            var candidate = baseName;
            var suffix = 1;

            while (await db.Users.AnyAsync(u => u.UserName == candidate, ct))
                candidate = $"{baseName}{suffix++}";

            return candidate;
        }

        internal static UserProfileModel ToProfile(User user, string[]? roles = null, string[]? permissions = null)
        {
            roles ??= user.UserRoles.Select(ur => ur.Role.Name).Distinct().ToArray();
            permissions ??= user.UserRoles
                .SelectMany(ur => ur.Role.RolePermissions)
                .Select(rp => rp.Permission.Code)
                .Distinct()
                .ToArray();

            return new UserProfileModel
            {
                Id = user.Id,
                Email = user.Email,
                UserName = user.UserName,
                FirstName = user.FirstName,
                LastName = user.LastName,
                FullName = user.FullName,
                PhoneNumber = user.PhoneNumber,
                IsActive = user.IsActive,
                CreatedAtUtc = user.CreatedAtUtc,
                LastLoginAtUtc = user.LastLoginAtUtc,
                Roles = roles,
                Permissions = permissions
            };
        }
    }
}
