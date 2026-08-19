using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Core.Domain
{
    public class RefreshToken
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid UserId { get; set; }
        public User User { get; set; } = default!;

        /// <summary>SHA-256 hash of the opaque token: the raw value never reaches the database.</summary>
        [MaxLength(128)]
        public string TokenHash { get; set; } = default!;

        public DateTime ExpiresAtUtc { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime? RevokedAtUtc { get; set; }

        [MaxLength(64)]
        public string? CreatedByIp { get; set; }

        /// <summary>Set when this token is rotated, giving a full reuse-detection chain.</summary>
        public Guid? ReplacedByTokenId { get; set; }

        public bool IsActive => RevokedAtUtc == null && DateTime.UtcNow < ExpiresAtUtc;
    }
}
