using BasketService.Api.Core.Application.Repository;
using BasketService.Api.Core.Application.Services;
using BasketService.Api.Core.Domain.Models;
using BasketService.Api.IntegrationEvents.Events;
using EventBus.Base.Abstraction;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using Velora.Shared.Middleware;
using Velora.Shared.Security;

namespace BasketService.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class BasketController : ControllerBase
    {
        private const int MaxLineQuantity = 20;

        private readonly IBasketRepository repository;
        private readonly IIdentityService identityService;
        private readonly IEventBus eventBus;
        private readonly ILogger<BasketController> logger;

        public BasketController(
            ILogger<BasketController> logger,
            IBasketRepository repository,
            IIdentityService identityService,
            IEventBus eventBus)
        {
            this.logger = logger;
            this.repository = repository;
            this.identityService = identityService;
            this.eventBus = eventBus;
        }

        [HttpGet]
        [AllowAnonymous]
        public IActionResult Get() => Ok("Basket Service is Up and Running");

        /// <summary>Basket of the authenticated caller.</summary>
        [HttpGet("me")]
        [ProducesResponseType(typeof(CustomerBasket), (int)HttpStatusCode.OK)]
        public async Task<ActionResult<CustomerBasket>> GetMyBasket()
        {
            var userId = CurrentUserId;

            return await repository.GetBasketAsync(userId) ?? new CustomerBasket(userId);
        }

        /// <summary>
        /// Legacy lookup by id. A caller may only read their own basket unless they are
        /// an administrator, otherwise the id would be an enumeration hole.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(CustomerBasket), (int)HttpStatusCode.OK)]
        public async Task<ActionResult<CustomerBasket>> GetBasketByIdAsync(string id)
        {
            if (!string.Equals(id, CurrentUserId, StringComparison.Ordinal) && !User.IsAdmin())
                return Forbid();

            return await repository.GetBasketAsync(id) ?? new CustomerBasket(id);
        }

        [HttpPost("update")]
        [ProducesResponseType(typeof(CustomerBasket), (int)HttpStatusCode.OK)]
        public async Task<ActionResult<CustomerBasket>> UpdateBasketAsync([FromBody] CustomerBasket value)
        {
            // The basket owner always comes from the token, never from the payload.
            value.BuyerId = CurrentUserId;

            foreach (var item in value.Items)
                item.Quantity = Math.Clamp(item.Quantity, 1, MaxLineQuantity);

            var updated = await repository.UpdateBasketAsync(value);

            return updated is null
                ? throw new ApiException("Sepet kaydedilemedi.", 500, "basket_persist_failed")
                : Ok(updated);
        }

        [HttpPost("additem")]
        [ProducesResponseType(typeof(CustomerBasket), (int)HttpStatusCode.OK)]
        public async Task<ActionResult<CustomerBasket>> AddItemToBasket([FromBody] BasketItem basketItem)
        {
            if (basketItem.Quantity < 1) basketItem.Quantity = 1;
            if (basketItem.Quantity > MaxLineQuantity) basketItem.Quantity = MaxLineQuantity;

            var userId = CurrentUserId;
            var basket = await repository.GetBasketAsync(userId) ?? new CustomerBasket(userId);

            // Adding the same product+variant increments the existing line instead of duplicating it.
            var existing = basket.Items.FirstOrDefault(i => i.IsSameLine(basketItem));

            if (existing is null)
            {
                basketItem.Id = Guid.NewGuid().ToString();
                basket.Items.Add(basketItem);
            }
            else
            {
                existing.Quantity = Math.Min(existing.Quantity + basketItem.Quantity, MaxLineQuantity);
                existing.UnitPrice = basketItem.UnitPrice;
            }

            var updated = await repository.UpdateBasketAsync(basket);

            return Ok(updated ?? basket);
        }

        [HttpPut("items/{lineId}")]
        [ProducesResponseType(typeof(CustomerBasket), (int)HttpStatusCode.OK)]
        public async Task<ActionResult<CustomerBasket>> UpdateQuantity(string lineId, [FromBody] UpdateQuantityRequest request)
        {
            var userId = CurrentUserId;
            var basket = await repository.GetBasketAsync(userId);

            if (basket is null) return NotFound();

            var line = basket.Items.FirstOrDefault(i => i.Id == lineId);
            if (line is null) return NotFound();

            if (request.Quantity <= 0)
                basket.Items.Remove(line);
            else
                line.Quantity = Math.Min(request.Quantity, MaxLineQuantity);

            var updated = await repository.UpdateBasketAsync(basket);

            return Ok(updated ?? basket);
        }

        [HttpDelete("items/{lineId}")]
        [ProducesResponseType(typeof(CustomerBasket), (int)HttpStatusCode.OK)]
        public async Task<ActionResult<CustomerBasket>> RemoveItem(string lineId)
        {
            var userId = CurrentUserId;
            var basket = await repository.GetBasketAsync(userId);

            if (basket is null) return NotFound();

            basket.Items.RemoveAll(i => i.Id == lineId);

            var updated = await repository.UpdateBasketAsync(basket);

            return Ok(updated ?? basket);
        }

        [HttpPost("clear")]
        public async Task<IActionResult> Clear()
        {
            await repository.DeleteBasketAsync(CurrentUserId);
            return NoContent();
        }

        /// <summary>
        /// Stores a coupon on the basket. The discount value is computed by CatalogService
        /// and re-validated there at checkout, so a tampered payload cannot create a discount.
        /// </summary>
        [HttpPost("coupon")]
        [ProducesResponseType(typeof(CustomerBasket), (int)HttpStatusCode.OK)]
        public async Task<ActionResult<CustomerBasket>> ApplyCoupon([FromBody] ApplyCouponRequest request)
        {
            var userId = CurrentUserId;
            var basket = await repository.GetBasketAsync(userId);

            if (basket is null) return NotFound();

            basket.CouponCode = request.Code.Trim().ToUpperInvariant();
            basket.DiscountAmount = Math.Clamp(request.DiscountAmount, 0, basket.Subtotal);

            var updated = await repository.UpdateBasketAsync(basket);

            return Ok(updated ?? basket);
        }

        [HttpDelete("coupon")]
        [ProducesResponseType(typeof(CustomerBasket), (int)HttpStatusCode.OK)]
        public async Task<ActionResult<CustomerBasket>> RemoveCoupon()
        {
            var userId = CurrentUserId;
            var basket = await repository.GetBasketAsync(userId);

            if (basket is null) return NotFound();

            basket.CouponCode = null;
            basket.DiscountAmount = 0;

            var updated = await repository.UpdateBasketAsync(basket);

            return Ok(updated ?? basket);
        }

        [HttpPost("checkout")]
        [ProducesResponseType((int)HttpStatusCode.Accepted)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public async Task<ActionResult> CheckoutAsync(
            [FromBody] BasketCheckout basketCheckout,
            [FromHeader(Name = "x-request-id")] string? requestId)
        {
            var userId = CurrentUserId;
            var userName = identityService.GetUserName();

            var basket = await repository.GetBasketAsync(userId);

            if (basket is null || basket.Items.Count == 0)
                throw new ApiException("Sepetiniz boş.", 400, "empty_basket");

            // x-request-id makes a retried checkout safe: the second call is a no-op.
            var checkoutId = string.IsNullOrWhiteSpace(requestId) ? Guid.NewGuid().ToString() : requestId;

            if (!await repository.TryRegisterCheckoutAsync(userId, checkoutId))
            {
                logger.LogInformation("Duplicate checkout request {RequestId} for {UserId} ignored.", checkoutId, userId);
                return Accepted();
            }

            var eventMessage = new OrderCreatedIntegrationEvent(
                userId,
                userName,
                basketCheckout.City,
                basketCheckout.Street,
                basketCheckout.State,
                basketCheckout.Country,
                basketCheckout.ZipCode,
                basketCheckout.CardNumber,
                basketCheckout.CardHolderName,
                basketCheckout.CardExpiration,
                basketCheckout.CardSecurityNumber,
                basketCheckout.CardTypeId,
                // Buyer identity is taken from the token, not from the request body.
                userId,
                basket);

            try
            {
                eventBus.Publish(eventMessage);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to publish OrderCreated event {IntegrationEventId}", eventMessage.Id);
                throw;
            }

            return Accepted();
        }

        [HttpDelete("{id}")]
        [ProducesResponseType((int)HttpStatusCode.NoContent)]
        public async Task<IActionResult> DeleteBasketByIdAsync(string id)
        {
            if (!string.Equals(id, CurrentUserId, StringComparison.Ordinal) && !User.IsAdmin())
                return Forbid();

            await repository.DeleteBasketAsync(id);

            return NoContent();
        }

        // ---------- wishlist ----------

        [HttpGet("wishlist")]
        [ProducesResponseType(typeof(CustomerWishlist), (int)HttpStatusCode.OK)]
        public Task<CustomerWishlist> GetWishlist() => repository.GetWishlistAsync(CurrentUserId);

        [HttpPost("wishlist/{productId:int}")]
        [ProducesResponseType(typeof(CustomerWishlist), (int)HttpStatusCode.OK)]
        public async Task<CustomerWishlist> AddToWishlist(int productId)
        {
            var wishlist = await repository.GetWishlistAsync(CurrentUserId);

            if (!wishlist.ProductIds.Contains(productId))
                wishlist.ProductIds.Insert(0, productId);

            return await repository.UpdateWishlistAsync(wishlist);
        }

        [HttpDelete("wishlist/{productId:int}")]
        [ProducesResponseType(typeof(CustomerWishlist), (int)HttpStatusCode.OK)]
        public async Task<CustomerWishlist> RemoveFromWishlist(int productId)
        {
            var wishlist = await repository.GetWishlistAsync(CurrentUserId);
            wishlist.ProductIds.Remove(productId);

            return await repository.UpdateWishlistAsync(wishlist);
        }

        private string CurrentUserId => User.GetUserKey();
    }

    public class UpdateQuantityRequest
    {
        public int Quantity { get; set; }
    }

    public class ApplyCouponRequest
    {
        public string Code { get; set; } = default!;

        public decimal DiscountAmount { get; set; }
    }
}
