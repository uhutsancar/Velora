namespace IdentityService.Api.Application.Models
{
    /// <summary>
    /// Kept backwards compatible with the original contract (UserName + UserToken)
    /// while adding the fields the Velora clients need.
    /// </summary>
    public class LoginResponseModel
    {
        public string UserName { get; set; } = default!;

        /// <summary>Legacy field name for the access token.</summary>
        public string UserToken { get; set; } = default!;

        public string AccessToken { get; set; } = default!;

        public string RefreshToken { get; set; } = default!;

        public DateTime ExpiresAtUtc { get; set; }

        public UserProfileModel User { get; set; } = default!;
    }
}
