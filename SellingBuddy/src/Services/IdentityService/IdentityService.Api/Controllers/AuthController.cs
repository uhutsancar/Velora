using IdentityService.Api.Application.Models;
using IdentityService.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using IdentityService.Api.Extensions.Registration;
using Microsoft.AspNetCore.RateLimiting;
using Velora.Shared.Security;

namespace IdentityService.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IIdentityService identityService;

        public AuthController(IIdentityService identityService)
        {
            this.identityService = identityService;
        }

        /// <summary>
        /// Original login endpoint (POST /api/auth) - kept at its old address so the
        /// existing gateway route and any older client keeps working.
        /// </summary>
        [HttpPost]
        [AllowAnonymous]
        [EnableRateLimiting(RateLimitPolicies.Auth)]
        public Task<LoginResponseModel> Login([FromBody] LoginRequestModel model, CancellationToken ct)
            => identityService.Login(model, RemoteIp, ct);

        [HttpPost("login")]
        [AllowAnonymous]
        [EnableRateLimiting(RateLimitPolicies.Auth)]
        public Task<LoginResponseModel> LoginAlias([FromBody] LoginRequestModel model, CancellationToken ct)
            => identityService.Login(model, RemoteIp, ct);

        [HttpPost("register")]
        [AllowAnonymous]
        [EnableRateLimiting(RateLimitPolicies.Auth)]
        public Task<LoginResponseModel> Register([FromBody] RegisterRequestModel model, CancellationToken ct)
            => identityService.Register(model, RemoteIp, ct);

        [HttpPost("refresh")]
        [AllowAnonymous]
        [EnableRateLimiting(RateLimitPolicies.Auth)]
        public Task<LoginResponseModel> Refresh([FromBody] RefreshTokenRequestModel model, CancellationToken ct)
            => identityService.Refresh(model.RefreshToken, RemoteIp, ct);

        [HttpPost("logout")]
        [AllowAnonymous]
        public async Task<IActionResult> Logout([FromBody] RefreshTokenRequestModel model, CancellationToken ct)
        {
            await identityService.Logout(model.RefreshToken, ct);
            return NoContent();
        }

        [HttpGet("me")]
        [Authorize]
        public Task<UserProfileModel> Me(CancellationToken ct)
            => identityService.GetProfile(User.GetUserId(), ct);

        [HttpPut("me")]
        [Authorize]
        public Task<UserProfileModel> UpdateMe([FromBody] UpdateProfileRequestModel model, CancellationToken ct)
            => identityService.UpdateProfile(User.GetUserId(), model, ct);

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestModel model, CancellationToken ct)
        {
            await identityService.ChangePassword(User.GetUserId(), model, ct);
            return NoContent();
        }

        private string? RemoteIp => HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
