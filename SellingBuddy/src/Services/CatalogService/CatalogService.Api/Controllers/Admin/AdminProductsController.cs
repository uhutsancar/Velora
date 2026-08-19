using CatalogService.Api.Core.Application.Dtos;
using CatalogService.Api.Core.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Velora.Shared.Contracts;
using Velora.Shared.Security;

namespace CatalogService.Api.Controllers.Admin
{
    /// <summary>
    /// Back-office product management. Authorization is enforced here, in the API,
    /// so hiding controls in the admin UI is never the only gate.
    /// </summary>
    [Route("api/admin/products")]
    [ApiController]
    [Authorize(Policy = VeloraPolicies.ProductsWrite)]
    public class AdminProductsController : ControllerBase
    {
        private readonly IProductAdminService products;

        public AdminProductsController(IProductAdminService products)
        {
            this.products = products;
        }

        [HttpGet]
        public Task<PagedResult<ProductListItemDto>> Search([FromQuery] AdminProductQuery query, CancellationToken ct)
            => products.Search(query, ct);

        [HttpGet("stats")]
        [Authorize(Policy = VeloraPolicies.AnalyticsRead)]
        public Task<CatalogStatsDto> Stats(CancellationToken ct) => products.GetStats(ct);

        [HttpGet("{id:int}")]
        public async Task<ActionResult<AdminProductDetailDto>> GetById(int id, CancellationToken ct)
        {
            var product = await products.GetById(id, ct);
            return product is null ? NotFound() : product;
        }

        [HttpPost]
        public async Task<ActionResult<AdminProductDetailDto>> Create([FromBody] CreateProductRequest request, CancellationToken ct)
        {
            var created = await products.Create(request, ct);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpPut("{id:int}")]
        public Task<AdminProductDetailDto> Update(int id, [FromBody] UpdateProductRequest request, CancellationToken ct)
            => products.Update(id, request, ct);

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            await products.Delete(id, ct);
            return NoContent();
        }

        [HttpPut("{id:int}/publish")]
        public async Task<IActionResult> SetPublishState(int id, [FromBody] UpdatePublishStateRequest request, CancellationToken ct)
        {
            await products.SetPublishState(id, request.IsPublished, ct);
            return NoContent();
        }

        [HttpPut("{id:int}/stock")]
        public async Task<IActionResult> UpdateStock(int id, [FromBody] UpdateStockRequest request, CancellationToken ct)
        {
            await products.UpdateStock(id, request, ct);
            return NoContent();
        }

        [HttpPut("{id:int}/pricing")]
        public async Task<IActionResult> UpdatePricing(int id, [FromBody] UpdatePricingRequest request, CancellationToken ct)
        {
            await products.UpdatePricing(id, request, ct);
            return NoContent();
        }

        [HttpPost("{id:int}/images")]
        public Task<ProductImageDto> AddImage(int id, [FromBody] ProductImageRequest request, CancellationToken ct)
            => products.AddImage(id, request, ct);

        [HttpDelete("{id:int}/images/{imageId:int}")]
        public async Task<IActionResult> DeleteImage(int id, int imageId, CancellationToken ct)
        {
            await products.DeleteImage(id, imageId, ct);
            return NoContent();
        }

        [HttpPut("{id:int}/images/order")]
        public async Task<IActionResult> ReorderImages(int id, [FromBody] ReorderImagesRequest request, CancellationToken ct)
        {
            await products.ReorderImages(id, request.ImageIds, ct);
            return NoContent();
        }

        [HttpPut("{id:int}/images/{imageId:int}/primary")]
        public async Task<IActionResult> SetPrimaryImage(int id, int imageId, CancellationToken ct)
        {
            await products.SetPrimaryImage(id, imageId, ct);
            return NoContent();
        }
    }
}
