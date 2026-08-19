using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Core.Domain
{
    public class Role
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [MaxLength(64)]
        public string Name { get; set; } = default!;

        [MaxLength(256)]
        public string? Description { get; set; }

        /// <summary>System roles cannot be removed through the admin API.</summary>
        public bool IsSystemRole { get; set; }

        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();

        public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    }
}
