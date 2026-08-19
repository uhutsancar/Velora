namespace IdentityService.Api.Core.Domain
{
    /// <summary>Join entity for the many-to-many User/Role relation.</summary>
    public class UserRole
    {
        public Guid UserId { get; set; }
        public User User { get; set; } = default!;

        public Guid RoleId { get; set; }
        public Role Role { get; set; } = default!;

        public DateTime AssignedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
