using CatalogService.Api.Core.Application.Dtos;
using CatalogService.Api.Core.Application.Services;
using Microsoft.AspNetCore.Mvc;
using Velora.Shared.Contracts;

namespace CatalogService.Api.Controllers
{
    /// <summary>
    /// Public storefront product API. Only published products are ever returned and
    /// cost/margin fields are never projected into these payloads.
    /// </summary>
    [Route("api/products")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly IProductQueryService products;

        public ProductsController(IProductQueryService products)
        {
            this.products = products;
        }

        [HttpGet]
        [ResponseCache(Duration = 30, Location = ResponseCacheLocation.Any, VaryByQueryKeys = new[] { "*" })]
        public Task<PagedResult<ProductListItemDto>> Search([FromQuery] ProductQuery query, CancellationToken ct)
            => products.Search(query, ct);

        [HttpGet("facets")]
        public Task<ProductFacetsDto> Facets([FromQuery] ProductQuery query, CancellationToken ct)
            => products.GetFacets(query, ct);

        [HttpGet("featured")]
        public Task<IReadOnlyCollection<ProductListItemDto>> Featured([FromQuery] int take = 8, CancellationToken ct = default)
            => products.GetFeatured(Clamp(take), ct);

        [HttpGet("new-arrivals")]
        public Task<IReadOnlyCollection<ProductListItemDto>> NewArrivals([FromQuery] int take = 8, CancellationToken ct = default)
            => products.GetNewArrivals(Clamp(take), ct);

        [HttpGet("best-sellers")]
        public Task<IReadOnlyCollection<ProductListItemDto>> BestSellers([FromQuery] int take = 8, CancellationToken ct = default)
            => products.GetBestSellers(Clamp(take), ct);

        /// <summary>Batch lookup used by the wishlist and the recently-viewed rail.</summary>
        [HttpGet("batch")]
        public Task<IReadOnlyCollection<ProductListItemDto>> Batch([FromQuery] string ids, CancellationToken ct)
        {
            var parsed = (ids ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(value => int.TryParse(value, out var id) ? id : 0)
                .Where(id => id > 0)
                .Distinct()
                .Take(100)
                .ToList();

            return products.GetByIds(parsed, ct);
        }

        [HttpGet("{slug}")]
        public async Task<ActionResult<ProductDetailDto>> GetBySlug(string slug, CancellationToken ct)
        {
            var product = await products.GetBySlug(slug, ct);

            if (product is null) return NotFound();

            // Fire and forget: a failed counter must never break the product page.
            _ = products.IncrementViewCount(product.Id, CancellationToken.None);

            return product;
        }

        [HttpGet("{slug}/related")]
        public Task<IReadOnlyCollection<ProductListItemDto>> Related(string slug, [FromQuery] int take = 8, CancellationToken ct = default)
            => products.GetRelated(slug, Clamp(take), ct);

        private static int Clamp(int take) => Math.Clamp(take, 1, 24);
    }
}
