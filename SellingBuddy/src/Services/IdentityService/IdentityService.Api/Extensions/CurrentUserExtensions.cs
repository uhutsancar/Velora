using System.Security.Claims;

namespace IdentityService.Api.Extensions
{
    public static class CurrentUserExtensions
    {
        /// <summary>Reads the authenticated user id from the NameIdentifier / sub claim.</summary>
        public static Guid GetUserId(this ClaimsPrincipal principal)
        {
            var raw = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? principal.FindFirstValue("sub");

            return Guid.TryParse(raw, out var id)
                ? id
                : throw new UnauthorizedAccessException("The token does not carry a valid user id.");
        }

        public static bool TryGetUserId(this ClaimsPrincipal principal, out Guid userId)
        {
            var raw = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub");
            return Guid.TryParse(raw, out userId);
        }
    }
}
