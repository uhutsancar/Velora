using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Application.Models
{
    public class RegisterRequestModel
    {
        [Required, EmailAddress, MaxLength(256)]
        public string Email { get; set; } = default!;

        [Required, MinLength(8), MaxLength(128)]
        public string Password { get; set; } = default!;

        [Required, MaxLength(128)]
        public string FirstName { get; set; } = default!;

        [Required, MaxLength(128)]
        public string LastName { get; set; } = default!;

        [MaxLength(32)]
        public string? PhoneNumber { get; set; }
    }

    public class RefreshTokenRequestModel
    {
        [Required]
        public string RefreshToken { get; set; } = default!;
    }

    public class ChangePasswordRequestModel
    {
        [Required]
        public string CurrentPassword { get; set; } = default!;

        [Required, MinLength(8), MaxLength(128)]
        public string NewPassword { get; set; } = default!;
    }

    public class UpdateProfileRequestModel
    {
        [Required, MaxLength(128)]
        public string FirstName { get; set; } = default!;

        [Required, MaxLength(128)]
        public string LastName { get; set; } = default!;

        [MaxLength(32)]
        public string? PhoneNumber { get; set; }
    }

    public class UserProfileModel
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = default!;
        public string UserName { get; set; } = default!;
        public string FirstName { get; set; } = default!;
        public string LastName { get; set; } = default!;
        public string FullName { get; set; } = default!;
        public string? PhoneNumber { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? LastLoginAtUtc { get; set; }
        public IReadOnlyCollection<string> Roles { get; set; } = Array.Empty<string>();
        public IReadOnlyCollection<string> Permissions { get; set; } = Array.Empty<string>();
    }

    public class AddressRequestModel
    {
        [Required, MaxLength(64)]
        public string Title { get; set; } = default!;

        [Required, MaxLength(128)]
        public string FirstName { get; set; } = default!;

        [Required, MaxLength(128)]
        public string LastName { get; set; } = default!;

        [Required, MaxLength(32)]
        public string Phone { get; set; } = default!;

        [Required, MaxLength(256)]
        public string Street { get; set; } = default!;

        [Required, MaxLength(128)]
        public string City { get; set; } = default!;

        [Required, MaxLength(128)]
        public string State { get; set; } = default!;

        [Required, MaxLength(128)]
        public string Country { get; set; } = default!;

        [Required, MaxLength(16)]
        public string ZipCode { get; set; } = default!;

        public bool IsDefault { get; set; }
    }

    public class AddressModel : AddressRequestModel
    {
        public Guid Id { get; set; }
    }

    public class AdminUserListItemModel
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = default!;
        public string FullName { get; set; } = default!;
        public string? PhoneNumber { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? LastLoginAtUtc { get; set; }
        public IReadOnlyCollection<string> Roles { get; set; } = Array.Empty<string>();
    }

    public class UpdateUserRolesRequestModel
    {
        [Required]
        public List<string> Roles { get; set; } = new();
    }

    public class UpdateUserStatusRequestModel
    {
        public bool IsActive { get; set; }
    }

    public class UserStatsModel
    {
        public int TotalUsers { get; set; }
        public int ActiveUsers { get; set; }
        public int NewUsersLast30Days { get; set; }
        public int AdminUsers { get; set; }
    }


    public class ResetPasswordRequestModel
    {
        [Required, MinLength(8), MaxLength(128)]
        public string NewPassword { get; set; } = default!;
    }

    public class RoleModel
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
        public bool IsSystemRole { get; set; }
        public IReadOnlyCollection<string> Permissions { get; set; } = Array.Empty<string>();
    }

    public class PermissionModel
    {
        public string Code { get; set; } = default!;
        public string? Description { get; set; }
    }
}
