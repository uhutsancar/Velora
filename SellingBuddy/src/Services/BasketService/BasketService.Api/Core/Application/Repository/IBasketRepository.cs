using BasketService.Api.Core.Domain.Models;

namespace BasketService.Api.Core.Application.Repository
{
    public interface IBasketRepository
    {
        Task<CustomerBasket?> GetBasketAsync(string customerId);

        Task<CustomerBasket?> UpdateBasketAsync(CustomerBasket basket);

        Task<bool> DeleteBasketAsync(string customerId);

        Task<CustomerWishlist> GetWishlistAsync(string customerId);

        Task<CustomerWishlist> UpdateWishlistAsync(CustomerWishlist wishlist);

        /// <summary>
        /// Marks a checkout request id as processed. Returns false when the same id was
        /// already seen, which makes the checkout endpoint idempotent.
        /// </summary>
        Task<bool> TryRegisterCheckoutAsync(string customerId, string requestId);
    }
}
