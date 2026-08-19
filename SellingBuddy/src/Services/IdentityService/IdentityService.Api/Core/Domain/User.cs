using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Core.Domain
{
    /// <summary>Aggregate root of the identity bounded context.</summary>
    public class User
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [MaxLength(256)]
        public string Email { get; set; } = default!;

        [MaxLength(128)]
        public string UserName { get; set; } = default!;

        [MaxLength(128)]
        public string FirstName { get; set; } = default!;

        [MaxLength(128)]
        public string LastName { get; set; } = default!;

        [MaxLength(32)]
        public string? PhoneNumber { get; set; }

        /// <summary>PBKDF2 hash, stored as {iterations}.{saltBase64}.{hashBase64}.</summary>
        [MaxLength(512)]
        public string PasswordHash { get; set; } = default!;

        public bool IsActive { get; set; } = true;

        public bool EmailConfirmed { get; set; }

        public int AccessFailedCount { get; set; }

        public DateTime? LockoutEndUtc { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAtUtc { get; set; }

        public DateTime? LastLoginAtUtc { get; set; }

        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();

        public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

        public ICollection<UserAddress> Addresses { get; set; } = new List<UserAddress>();

        public string FullName => $"{FirstName} {LastName}".Trim();
    }
}
