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

namespace CatalogService.Api.Controllers
{
    [Route("api/products/{productId:int}/reviews")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly CatalogContext db;

        public ReviewsController(CatalogContext db) => this.db = db;

        [HttpGet]
        [AllowAnonymous]
        public async Task<PagedResult<ReviewDto>> List(
            int productId,
            [FromQuery] int pageIndex = 0,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            pageSize = Math.Clamp(pageSize, 1, 50);

            var query = db.ProductReviews.AsNoTracking()
                .Where(r => r.CatalogItemId == productId && r.IsApproved);

            var total = await query.LongCountAsync(ct);

            var rows = await query
                .OrderByDescending(r => r.CreatedAtUtc)
                .Skip(pageIndex * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            return new PagedResult<ReviewDto>(rows.Select(ProductMapper.ToReviewDto).ToList(), pageIndex, pageSize, total);
        }

        [HttpGet("summary")]
        [AllowAnonymous]
        public async Task<ReviewSummaryDto> Summary(int productId, CancellationToken ct)
        {
            var buckets = await db.ProductReviews.AsNoTracking()
                .Where(r => r.CatalogItemId == productId && r.IsApproved)
                .GroupBy(r => r.Rating)
                .Select(g => new { Rating = g.Key, Count = g.Count() })
                .ToListAsync(ct);

            var total = buckets.Sum(b => b.Count);

            return new ReviewSummaryDto
            {
                Total = total,
                Average = total == 0 ? 0 : Math.Round((decimal)buckets.Sum(b => b.Rating * b.Count) / total, 2),
                Distribution = Enumerable.Range(1, 5)
                    .ToDictionary(star => star, star => buckets.FirstOrDefault(b => b.Rating == star)?.Count ?? 0)
            };
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<ReviewDto>> Create(int productId, [FromBody] CreateReviewRequest request, CancellationToken ct)
        {
            if (!await db.CatalogItems.AnyAsync(p => p.Id == productId && p.IsPublished, ct))
                return NotFound();

            var userId = User.GetUserId();

            if (await db.ProductReviews.AnyAsync(r => r.CatalogItemId == productId && r.UserId == userId, ct))
                throw new ApiException("You have already reviewed this product.", 409, "duplicate_review");

            var review = new ProductReview
            {
                CatalogItemId = productId,
                UserId = userId,
                // Identity comes from the token, never from the request body.
                UserName = User.GetDisplayName() ?? "Velora müşterisi",
                Rating = request.Rating,
                Title = request.Title,
                Comment = request.Comment.Trim(),
                IsApproved = true
            };

            db.ProductReviews.Add(review);
            await db.SaveChangesAsync(ct);

            await RecalculateRating(productId, ct);

            return CreatedAtAction(nameof(List), new { productId }, ProductMapper.ToReviewDto(review));
        }

        [HttpDelete("{reviewId:int}")]
        [Authorize]
        public async Task<IActionResult> Delete(int productId, int reviewId, CancellationToken ct)
        {
            var review = await db.ProductReviews.FirstOrDefaultAsync(r => r.Id == reviewId && r.CatalogItemId == productId, ct);
            if (review is null) return NotFound();

            // Customers can remove their own review; back office can remove any.
            if (review.UserId != User.GetUserId() && !User.IsAdmin())
                return Forbid();

            db.ProductReviews.Remove(review);
            await db.SaveChangesAsync(ct);

            await RecalculateRating(productId, ct);

            return NoContent();
        }

        /// <summary>Denormalises the rating onto the product so listings stay a single query.</summary>
        private async Task RecalculateRating(int productId, CancellationToken ct)
        {
            var stats = await db.ProductReviews.AsNoTracking()
                .Where(r => r.CatalogItemId == productId && r.IsApproved)
                .GroupBy(_ => 1)
                .Select(g => new { Count = g.Count(), Sum = g.Sum(r => r.Rating) })
                .FirstOrDefaultAsync(ct);

            var count = stats?.Count ?? 0;
            var average = count == 0 ? 0m : Math.Round((decimal)stats!.Sum / count, 2);

            await db.CatalogItems
                .Where(p => p.Id == productId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(p => p.RatingCount, count)
                    .SetProperty(p => p.RatingAverage, average), ct);
        }
    }
}
