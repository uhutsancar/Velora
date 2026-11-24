using BasketService.Api.Core.Application.Repository;
using BasketService.Api.Core.Application.Services;
using BasketService.Api.Core.Domain.Models;
using BasketService.Api.IntegrationEvents.Events;
using EventBus.Base.Abstraction;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Security.Cryptography;
using System.Text;
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
        private readonly ICatalogQuoteClient catalogQuotes;
        private readonly ILogger<BasketController> logger;

        public BasketController(
            ILogger<BasketController> logger,
            IBasketRepository repository,
            IIdentityService identityService,
            IEventBus eventBus,
            ICatalogQuoteClient catalogQuotes)
        {
            this.logger = logger;
            this.repository = repository;
            this.identityService = identityService;
            this.eventBus = eventBus;
            this.catalogQuotes = catalogQuotes;
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

            var quote = await catalogQuotes.CreateQuoteAsync(basket, request.Code, HttpContext.RequestAborted);
            ApplyQuote(basket, quote);

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

            var orderId = string.IsNullOrWhiteSpace(requestId)
                ? Guid.NewGuid()
                : Guid.TryParse(requestId, out var parsedCheckoutId)
                    ? parsedCheckoutId
                    : throw new ApiException("x-request-id must be a UUID.", 400, "invalid_request_id");
            var checkoutId = orderId.ToString();
            var requestHash = CalculateCheckoutHash(userId, basketCheckout);

            var registeredHash = await repository.GetCheckoutHashAsync(userId, checkoutId);
            if (registeredHash is not null)
            {
                EnsureSameRequest(registeredHash, requestHash);
                logger.LogInformation("Duplicate checkout request {RequestId} for {UserId} returned as accepted.", checkoutId, userId);
                return Accepted();
            }

            var lockToken = await repository.TryAcquireCheckoutLockAsync(userId, checkoutId);
            if (lockToken is null)
                throw new ApiException(
                    "A checkout with this x-request-id is already in progress.",
                    409,
                    "checkout_in_progress");

            try
            {
                // A concurrent request may have completed while this request acquired the lock.
                registeredHash = await repository.GetCheckoutHashAsync(userId, checkoutId);
                if (registeredHash is not null)
                {
                    EnsureSameRequest(registeredHash, requestHash);
                    return Accepted();
                }

                var basket = await repository.GetBasketAsync(userId);
                if (basket is null || basket.Items.Count == 0)
                    throw new ApiException("Sepetiniz boş.", 400, "empty_basket");

                // Re-price immediately before accepting the checkout. Client supplied
                // product names, prices, stock hints and discounts are discarded.
                var quote = await catalogQuotes.CreateQuoteAsync(basket, basket.CouponCode, HttpContext.RequestAborted);
                ApplyQuote(basket, quote);
                await repository.UpdateBasketAsync(basket);

                var eventMessage = new OrderCreatedIntegrationEvent(
                    orderId,
                    userId,
                    userName,
                    basketCheckout.City,
                    basketCheckout.Street,
                    basketCheckout.State,
                    basketCheckout.Country,
                    basketCheckout.ZipCode,
                    basketCheckout.PaymentProvider,
                    basketCheckout.PaymentMethodToken,
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

                // Persist only after the broker confirms. A crash before this point can
                // republish the same deterministic OrderId; downstream effects deduplicate it.
                await repository.TryRegisterCheckoutAsync(userId, checkoutId, requestHash);

                return Accepted();
            }
            finally
            {
                await repository.ReleaseCheckoutLockAsync(userId, checkoutId, lockToken);
            }
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

        private static string CalculateCheckoutHash(string userId, BasketCheckout checkout)
        {
            var canonical = string.Join('\u001f',
                userId,
                checkout.City.Trim(),
                checkout.Street.Trim(),
                checkout.State.Trim(),
                checkout.Country.Trim(),
                checkout.ZipCode.Trim(),
                checkout.PaymentProvider.Trim().ToLowerInvariant(),
                checkout.PaymentMethodToken);

            return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical)));
        }

        private static void EnsureSameRequest(string registeredHash, string requestHash)
        {
            if (!string.Equals(registeredHash, requestHash, StringComparison.Ordinal))
                throw new ApiException(
                    "The x-request-id was already used with a different checkout payload.",
                    409,
                    "idempotency_conflict");
        }

        private static void ApplyQuote(CustomerBasket basket, CatalogQuote quote)
        {
            basket.Items = quote.Lines.Select(line => new BasketItem
            {
                Id = basket.Items.FirstOrDefault(existing =>
                    existing.ProductId == line.ProductId && existing.VariantId == line.VariantId)?.Id
                    ?? Guid.NewGuid().ToString(),
                ProductId = line.ProductId,
                ProductName = line.ProductName,
                Slug = line.Slug,
                VariantId = line.VariantId,
                VariantLabel = line.VariantLabel,
                Quantity = line.Quantity,
                UnitPrice = line.UnitPrice,
                OldUnitPrice = line.UnitPrice,
                AvailableStock = line.AvailableStock,
                PictureUrl = line.PictureUrl ?? string.Empty
            }).ToList();
            basket.CouponCode = quote.CouponCode;
            basket.DiscountAmount = quote.DiscountAmount;
            basket.QuoteId = quote.QuoteId;
            basket.QuoteValidUntilUtc = quote.ValidUntilUtc;
            basket.Currency = quote.Currency;
        }
    }

    public class UpdateQuantityRequest
    {
        public int Quantity { get; set; }
    }

    public class ApplyCouponRequest
    {
        public string Code { get; set; } = default!;

    }
}
