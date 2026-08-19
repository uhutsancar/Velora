using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Application.Models
{
    public class LoginRequestModel
    {
        /// <summary>Email address or username.</summary>
        [Required]
        public string UserName { get; set; } = default!;

        [Required]
        public string Password { get; set; } = default!;
    }
}
