using CatalogService.Api.Core.Application.Dtos;
using CatalogService.Api.Core.Application.Mapping;
using CatalogService.Api.Infrastructure.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CatalogService.Api.Controllers
{
    /// <summary>
    /// Public coupon validation. The endpoint deliberately never lists coupons:
    /// customers can only test a code they already know.
    /// </summary>
    [Route("api/coupons")]
    [ApiController]
    public class CouponsController : ControllerBase
    {
        private readonly CatalogContext db;

        public CouponsController(CatalogContext db) => this.db = db;

        [HttpPost("validate")]
        [Authorize]
        public async Task<CouponValidationResult> Validate([FromBody] ValidateCouponRequest request, CancellationToken ct)
        {
            var code = request.Code.Trim().ToUpperInvariant();

            var coupon = await db.Coupons.AsNoTracking().FirstOrDefaultAsync(c => c.Code == code, ct);

            if (coupon is null)
                return Invalid("Bu kupon kodu bulunamadı.");

            var now = DateTime.UtcNow;

            if (!coupon.IsActive)
                return Invalid("Bu kupon artık geçerli değil.");

            if (coupon.StartsAtUtc > now)
                return Invalid("Bu kupon henüz başlamadı.");

            if (coupon.EndsAtUtc < now)
                return Invalid("Bu kuponun süresi dolmuş.");

            if (coupon.UsageLimit is { } limit && coupon.UsedCount >= limit)
                return Invalid("Bu kuponun kullanım hakkı doldu.");

            if (request.Subtotal < coupon.MinimumOrderAmount)
                return Invalid($"Bu kupon için minimum sepet tutarı {coupon.MinimumOrderAmount:N2} TL.");

            var discount = coupon.CalculateDiscount(request.Subtotal);

            if (discount <= 0)
                return Invalid("Bu kupon sepetinize indirim uygulamıyor.");

            return new CouponValidationResult
            {
                IsValid = true,
                Code = coupon.Code,
                DiscountAmount = discount,
                DiscountType = coupon.DiscountType,
                DiscountValue = coupon.DiscountValue,
                Message = "Kupon uygulandı."
            };
        }

        private static CouponValidationResult Invalid(string message) => new()
        {
            IsValid = false,
            DiscountAmount = 0,
            Message = message
        };
    }

    /// <summary>Public campaign feed powering hero slides and landing strips.</summary>
    [Route("api/campaigns")]
    [ApiController]
    public class CampaignsController : ControllerBase
    {
        private readonly CatalogContext db;

        public CampaignsController(CatalogContext db) => this.db = db;

        [HttpGet]
        public async Task<IReadOnlyCollection<CampaignDto>> List([FromQuery] string? placement, CancellationToken ct)
        {
            var now = DateTime.UtcNow;

            var query = db.Campaigns.AsNoTracking()
                .Include(c => c.Category)
                .Where(c => c.IsActive && c.StartsAtUtc <= now && c.EndsAtUtc >= now);

            if (!string.IsNullOrWhiteSpace(placement) &&
                Enum.TryParse<Core.Domain.CampaignPlacement>(placement, true, out var parsed))
            {
                query = query.Where(c => c.Placement == parsed);
            }

            var campaigns = await query.OrderBy(c => c.DisplayOrder).ThenByDescending(c => c.StartsAtUtc).ToListAsync(ct);

            return campaigns.Select(ProductMapper.ToCampaignDto).ToList();
        }

        [HttpGet("{slug}")]
        public async Task<ActionResult<CampaignDto>> GetBySlug(string slug, CancellationToken ct)
        {
            var now = DateTime.UtcNow;

            var campaign = await db.Campaigns.AsNoTracking()
                .Include(c => c.Category)
                .FirstOrDefaultAsync(c => c.Slug == slug && c.IsActive && c.StartsAtUtc <= now && c.EndsAtUtc >= now, ct);

            return campaign is null ? NotFound() : ProductMapper.ToCampaignDto(campaign);
        }
    }
}
