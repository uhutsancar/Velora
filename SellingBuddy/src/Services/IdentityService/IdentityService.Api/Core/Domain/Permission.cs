using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Core.Domain
{
    public class Permission
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>Dotted permission code from Velora.Shared, e.g. "products.write".</summary>
        [MaxLength(128)]
        public string Code { get; set; } = default!;

        [MaxLength(256)]
        public string? Description { get; set; }

        public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    }
}
