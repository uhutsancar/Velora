namespace IdentityService.Api.Core.Domain
{
    /// <summary>Join entity for the many-to-many Role/Permission relation.</summary>
    public class RolePermission
    {
        public Guid RoleId { get; set; }
        public Role Role { get; set; } = default!;

        public Guid PermissionId { get; set; }
        public Permission Permission { get; set; } = default!;
    }
}
