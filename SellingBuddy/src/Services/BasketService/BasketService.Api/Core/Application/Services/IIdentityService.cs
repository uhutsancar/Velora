namespace BasketService.Api.Core.Application.Services
{
    public interface IIdentityService
    {
        /// <summary>Stable user key used as the Redis basket/wishlist key.</summary>
        string GetUserName();

        /// <summary>Friendly display name for events and notifications.</summary>
        string GetDisplayName();
    }
}
