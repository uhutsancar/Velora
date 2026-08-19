using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Core.Domain
{
    /// <summary>
    /// Customer address book. Orders keep their own immutable snapshot of the shipping
    /// address, so editing an entry here never rewrites historical orders.
    /// </summary>
    public class UserAddress
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid UserId { get; set; }
        public User User { get; set; } = default!;

        [MaxLength(64)]
        public string Title { get; set; } = default!;

        [MaxLength(128)]
        public string FirstName { get; set; } = default!;

        [MaxLength(128)]
        public string LastName { get; set; } = default!;

        [MaxLength(32)]
        public string Phone { get; set; } = default!;

        [MaxLength(256)]
        public string Street { get; set; } = default!;

        [MaxLength(128)]
        public string City { get; set; } = default!;

        [MaxLength(128)]
        public string State { get; set; } = default!;

        [MaxLength(128)]
        public string Country { get; set; } = "Turkiye";

        [MaxLength(16)]
        public string ZipCode { get; set; } = default!;

        public bool IsDefault { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
