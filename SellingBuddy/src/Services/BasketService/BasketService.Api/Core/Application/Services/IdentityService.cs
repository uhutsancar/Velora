using Velora.Shared.Security;

namespace BasketService.Api.Core.Application.Services
{
    public sealed class IdentityService : IIdentityService
    {
        private readonly IHttpContextAccessor httpContextAccessor;

        public IdentityService(IHttpContextAccessor httpContextAccessor)
        {
            this.httpContextAccessor = httpContextAccessor;
        }

        /// <summary>User id from the token; also the Redis key the basket is stored under.</summary>
        public string GetUserName()
        {
            var user = httpContextAccessor.HttpContext?.User
                       ?? throw new UnauthorizedAccessException("No authenticated user on the current request.");

            return user.GetUserKey();
        }

        public string GetDisplayName()
        {
            var user = httpContextAccessor.HttpContext?.User;

            return user?.GetDisplayName() ?? GetUserName();
        }
    }
}
