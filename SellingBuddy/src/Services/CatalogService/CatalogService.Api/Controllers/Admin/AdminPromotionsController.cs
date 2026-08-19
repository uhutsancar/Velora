using CatalogService.Api.Core.Application.Dtos;
using CatalogService.Api.Core.Application.Mapping;
using CatalogService.Api.Core.Domain;
using CatalogService.Api.Infrastructure.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Velora.Shared.Contracts;
using Velora.Shared.Middleware;
using Velora.Shared.Security;
using Velora.Shared.Text;

namespace CatalogService.Api.Controllers.Admin
{
    [Route("api/admin/coupons")]
    [ApiController]
    [Authorize(Policy = VeloraPolicies.CouponsWrite)]
    public class AdminCouponsController : ControllerBase
    {
        private readonly CatalogContext db;

        public AdminCouponsController(CatalogContext db) => this.db = db;

        [HttpGet]
        public async Task<PagedResult<CouponDto>> List(
            [FromQuery] string? search,
            [FromQuery] bool? isActive,
            [FromQuery] int pageIndex = 0,
            [FromQuery] int pageSize = 20,
            CancellationToken ct = default)
        {
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = db.Coupons.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToUpper();
                query = query.Where(c => c.Code.Contains(term));
            }

            if (isActive is { } active) query = query.Where(c => c.IsActive == active);

            var total = await query.LongCountAsync(ct);

            var rows = await query
                .OrderByDescending(c => c.CreatedAtUtc)
                .Skip(pageIndex * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            return new PagedResult<CouponDto>(rows.Select(ProductMapper.ToCouponDto).ToList(), pageIndex, pageSize, total);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<CouponDto>> GetById(int id, CancellationToken ct)
        {
            var coupon = await db.Coupons.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
            return coupon is null ? NotFound() : ProductMapper.ToCouponDto(coupon);
        }

        [HttpPost]
        public async Task<ActionResult<CouponDto>> Create([FromBody] CouponRequest request, CancellationToken ct)
        {
            Validate(request);

            var code = request.Code.Trim().ToUpperInvariant();

            if (await db.Coupons.AnyAsync(c => c.Code == code, ct))
                throw new ApiException("Bu kupon kodu zaten kullanılıyor.", 409, "duplicate_code");

            var coupon = new Coupon { Code = code };
            Apply(coupon, request);

            db.Coupons.Add(coupon);
            await db.SaveChangesAsync(ct);

            return CreatedAtAction(nameof(GetById), new { id = coupon.Id }, ProductMapper.ToCouponDto(coupon));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<CouponDto>> Update(int id, [FromBody] CouponRequest request, CancellationToken ct)
        {
            Validate(request);

            var coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (coupon is null) return NotFound();

            var code = request.Code.Trim().ToUpperInvariant();

            if (code != coupon.Code && await db.Coupons.AnyAsync(c => c.Code == code, ct))
                throw new ApiException("Bu kupon kodu zaten kullanılıyor.", 409, "duplicate_code");

            coupon.Code = code;
            Apply(coupon, request);

            await db.SaveChangesAsync(ct);

            return ProductMapper.ToCouponDto(coupon);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (coupon is null) return NotFound();

            db.Coupons.Remove(coupon);
            await db.SaveChangesAsync(ct);

            return NoContent();
        }

        private static void Validate(CouponRequest request)
        {
            if (request.EndsAtUtc <= request.StartsAtUtc)
                throw new ApiException("Bitiş tarihi başlangıç tarihinden sonra olmalı.", 400, "invalid_dates");

            if (request.DiscountType == DiscountType.Percentage && request.DiscountValue is <= 0 or > 100)
                throw new ApiException("Yüzde indirim 1 ile 100 arasında olmalı.", 400, "invalid_discount");

            if (request.DiscountType == DiscountType.FixedAmount && request.DiscountValue <= 0)
                throw new ApiException("Tutar indirimi sıfırdan büyük olmalı.", 400, "invalid_discount");
        }

        private static void Apply(Coupon coupon, CouponRequest request)
        {
            coupon.Description = request.Description;
            coupon.DiscountType = request.DiscountType;
            coupon.DiscountValue = request.DiscountValue;
            coupon.MinimumOrderAmount = request.MinimumOrderAmount;
            coupon.MaxDiscountAmount = request.MaxDiscountAmount;
            coupon.UsageLimit = request.UsageLimit;
            coupon.PerUserLimit = request.PerUserLimit;
            coupon.StartsAtUtc = request.StartsAtUtc;
            coupon.EndsAtUtc = request.EndsAtUtc;
            coupon.IsActive = request.IsActive;
        }
    }

    [Route("api/admin/campaigns")]
    [ApiController]
    [Authorize(Policy = VeloraPolicies.CampaignsWrite)]
    public class AdminCampaignsController : ControllerBase
    {
        private readonly CatalogContext db;

        public AdminCampaignsController(CatalogContext db) => this.db = db;

        [HttpGet]
        public async Task<IReadOnlyCollection<CampaignDto>> List(CancellationToken ct)
        {
            var campaigns = await db.Campaigns.AsNoTracking()
                .Include(c => c.Category)
                .OrderBy(c => c.DisplayOrder).ThenByDescending(c => c.StartsAtUtc)
                .ToListAsync(ct);

            return campaigns.Select(ProductMapper.ToCampaignDto).ToList();
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<CampaignDto>> GetById(int id, CancellationToken ct)
        {
            var campaign = await db.Campaigns.AsNoTracking().Include(c => c.Category).FirstOrDefaultAsync(c => c.Id == id, ct);
            return campaign is null ? NotFound() : ProductMapper.ToCampaignDto(campaign);
        }

        [HttpPost]
        public async Task<ActionResult<CampaignDto>> Create([FromBody] CampaignRequest request, CancellationToken ct)
        {
            Validate(request);

            var campaign = new Campaign { Slug = await UniqueSlug(request.Slug ?? request.Name, null, ct) };
            Apply(campaign, request);

            db.Campaigns.Add(campaign);
            await db.SaveChangesAsync(ct);

            return CreatedAtAction(nameof(GetById), new { id = campaign.Id }, ProductMapper.ToCampaignDto(campaign));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<CampaignDto>> Update(int id, [FromBody] CampaignRequest request, CancellationToken ct)
        {
            Validate(request);

            var campaign = await db.Campaigns.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (campaign is null) return NotFound();

            if (!string.IsNullOrWhiteSpace(request.Slug) && request.Slug != campaign.Slug)
                campaign.Slug = await UniqueSlug(request.Slug, id, ct);

            Apply(campaign, request);
            await db.SaveChangesAsync(ct);

            return ProductMapper.ToCampaignDto(campaign);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var campaign = await db.Campaigns.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (campaign is null) return NotFound();

            db.Campaigns.Remove(campaign);
            await db.SaveChangesAsync(ct);

            return NoContent();
        }

        private static void Validate(CampaignRequest request)
        {
            if (request.EndsAtUtc <= request.StartsAtUtc)
                throw new ApiException("Bitiş tarihi başlangıç tarihinden sonra olmalı.", 400, "invalid_dates");
        }

        private static void Apply(Campaign campaign, CampaignRequest request)
        {
            campaign.Name = request.Name.Trim();
            campaign.Description = request.Description;
            campaign.ImageUrl = request.ImageUrl;
            campaign.BannerUrl = request.BannerUrl;
            campaign.CtaLabel = request.CtaLabel;
            campaign.CtaUrl = request.CtaUrl;
            campaign.DiscountPercentage = request.DiscountPercentage;
            campaign.CategoryId = request.CategoryId;
            campaign.Placement = request.Placement;
            campaign.StartsAtUtc = request.StartsAtUtc;
            campaign.EndsAtUtc = request.EndsAtUtc;
            campaign.IsActive = request.IsActive;
            campaign.DisplayOrder = request.DisplayOrder;
        }

        private async Task<string> UniqueSlug(string source, int? excludeId, CancellationToken ct)
        {
            var taken = (await db.Campaigns
                    .Where(c => excludeId == null || c.Id != excludeId)
                    .Select(c => c.Slug)
                    .ToListAsync(ct))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            return Slug.Unique(source, candidate => taken.Contains(candidate), "kampanya");
        }
    }

    /// <summary>Back-office review moderation.</summary>
    [Route("api/admin/reviews")]
    [ApiController]
    [Authorize(Policy = VeloraPolicies.ProductsWrite)]
    public class AdminReviewsController : ControllerBase
    {
        private readonly CatalogContext db;

        public AdminReviewsController(CatalogContext db) => this.db = db;

        [HttpGet]
        public async Task<PagedResult<ReviewDto>> List(
            [FromQuery] bool? approved,
            [FromQuery] int pageIndex = 0,
            [FromQuery] int pageSize = 20,
            CancellationToken ct = default)
        {
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = db.ProductReviews.AsNoTracking().Include(r => r.CatalogItem).AsQueryable();

            if (approved is { } isApproved) query = query.Where(r => r.IsApproved == isApproved);

            var total = await query.LongCountAsync(ct);

            var rows = await query
                .OrderByDescending(r => r.CreatedAtUtc)
                .Skip(pageIndex * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            return new PagedResult<ReviewDto>(rows.Select(ProductMapper.ToReviewDto).ToList(), pageIndex, pageSize, total);
        }

        [HttpPut("{id:int}/approval")]
        public async Task<IActionResult> SetApproval(int id, [FromBody] SetApprovalRequest request, CancellationToken ct)
        {
            var review = await db.ProductReviews.FirstOrDefaultAsync(r => r.Id == id, ct);
            if (review is null) return NotFound();

            review.IsApproved = request.IsApproved;
            await db.SaveChangesAsync(ct);

            return NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var review = await db.ProductReviews.FirstOrDefaultAsync(r => r.Id == id, ct);
            if (review is null) return NotFound();

            db.ProductReviews.Remove(review);
            await db.SaveChangesAsync(ct);

            return NoContent();
        }
    }

    public class SetApprovalRequest
    {
        public bool IsApproved { get; set; }
    }
}
