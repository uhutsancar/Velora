using CatalogService.Api.Core.Application.ViewModels;
using CatalogService.Api.Core.Domain;
using CatalogService.Api.Infastructure;
using CatalogService.Api.Infrastructure.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Net;
using Velora.Shared.Security;
using Velora.Shared.Text;

namespace CatalogService.Api.Controllers
{
    /// <summary>
    /// Original eShop-style catalogue API. Kept at its existing routes and shapes for
    /// backwards compatibility; the storefront uses /api/products instead.
    /// Write operations now require the products.write permission.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class CatalogController : ControllerBase
    {
        private readonly CatalogContext _catalogContext;
        private readonly CatalogSettings _settings;

        public CatalogController(CatalogContext context, IOptionsSnapshot<CatalogSettings> settings)
        {
            _catalogContext = context ?? throw new ArgumentNullException(nameof(context));
            _settings = settings.Value;

            context.ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;
        }

        // GET api/catalog/items[?pageSize=3&pageIndex=10]
        [HttpGet]
        [Route("items")]
        [ProducesResponseType(typeof(PaginatedItemsViewModel<CatalogItem>), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public async Task<IActionResult> ItemsAsync([FromQuery] int pageSize = 10, [FromQuery] int pageIndex = 0, string? ids = null)
        {
            if (!string.IsNullOrEmpty(ids))
            {
                var items = await GetItemsByIdsAsync(ids);

                if (items.Count == 0)
                    return BadRequest("ids value invalid. Must be comma-separated list of numbers");

                return Ok(items);
            }

            var totalItems = await _catalogContext.CatalogItems.LongCountAsync();

            var itemsOnPage = await _catalogContext.CatalogItems
                .OrderBy(c => c.Name)
                .Skip(pageSize * pageIndex)
                .Take(pageSize)
                .ToListAsync();

            itemsOnPage = ChangeUriPlaceholder(itemsOnPage);

            return Ok(new PaginatedItemsViewModel<CatalogItem>(pageIndex, pageSize, totalItems, itemsOnPage));
        }

        private async Task<List<CatalogItem>> GetItemsByIdsAsync(string ids)
        {
            var numIds = ids.Split(',').Select(id => (Ok: int.TryParse(id, out var x), Value: x)).ToList();

            if (!numIds.All(nid => nid.Ok))
                return new List<CatalogItem>();

            var idsToSelect = numIds.Select(id => id.Value).ToList();

            var items = await _catalogContext.CatalogItems.Where(ci => idsToSelect.Contains(ci.Id)).ToListAsync();

            return ChangeUriPlaceholder(items);
        }

        [HttpGet]
        [Route("items/{id:int}")]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        [ProducesResponseType(typeof(CatalogItem), (int)HttpStatusCode.OK)]
        public async Task<ActionResult<CatalogItem>> ItemByIdAsync(int id)
        {
            if (id <= 0) return BadRequest();

            var item = await _catalogContext.CatalogItems.SingleOrDefaultAsync(ci => ci.Id == id);

            if (item is null) return NotFound();

            ApplyPictureUri(item);

            return item;
        }

        // GET api/catalog/items/withname/samplename[?pageSize=3&pageIndex=10]
        [HttpGet]
        [Route("items/withname/{name:minlength(1)}")]
        [ProducesResponseType(typeof(PaginatedItemsViewModel<CatalogItem>), (int)HttpStatusCode.OK)]
        public async Task<ActionResult<PaginatedItemsViewModel<CatalogItem>>> ItemsWithNameAsync(
            string name, [FromQuery] int pageSize = 10, [FromQuery] int pageIndex = 0)
        {
            var root = _catalogContext.CatalogItems.Where(c => c.Name.StartsWith(name));

            var totalItems = await root.LongCountAsync();

            var itemsOnPage = await root
                .Skip(pageSize * pageIndex)
                .Take(pageSize)
                .ToListAsync();

            return new PaginatedItemsViewModel<CatalogItem>(pageIndex, pageSize, totalItems, ChangeUriPlaceholder(itemsOnPage));
        }

        // GET api/catalog/items/type/1/brand/2[?pageSize=3&pageIndex=10]
        [HttpGet]
        [Route("items/type/{catalogTypeId}/brand/{catalogBrandId:int?}")]
        [ProducesResponseType(typeof(PaginatedItemsViewModel<CatalogItem>), (int)HttpStatusCode.OK)]
        public async Task<ActionResult<PaginatedItemsViewModel<CatalogItem>>> ItemsByTypeIdAndBrandIdAsync(
            int catalogTypeId, int? catalogBrandId, [FromQuery] int pageSize = 10, [FromQuery] int pageIndex = 0)
        {
            var root = _catalogContext.CatalogItems.Where(ci => ci.CatalogTypeId == catalogTypeId);

            if (catalogBrandId.HasValue)
                root = root.Where(ci => ci.CatalogBrandId == catalogBrandId);

            var totalItems = await root.LongCountAsync();

            var itemsOnPage = await root.Skip(pageSize * pageIndex).Take(pageSize).ToListAsync();

            return new PaginatedItemsViewModel<CatalogItem>(pageIndex, pageSize, totalItems, ChangeUriPlaceholder(itemsOnPage));
        }

        // GET api/catalog/items/type/all/brand/2[?pageSize=3&pageIndex=10]
        [HttpGet]
        [Route("items/type/all/brand/{catalogBrandId:int?}")]
        [ProducesResponseType(typeof(PaginatedItemsViewModel<CatalogItem>), (int)HttpStatusCode.OK)]
        public async Task<ActionResult<PaginatedItemsViewModel<CatalogItem>>> ItemsByBrandIdAsync(
            int? catalogBrandId, [FromQuery] int pageSize = 10, [FromQuery] int pageIndex = 0)
        {
            var root = (IQueryable<CatalogItem>)_catalogContext.CatalogItems;

            if (catalogBrandId.HasValue)
                root = root.Where(ci => ci.CatalogBrandId == catalogBrandId);

            var totalItems = await root.LongCountAsync();

            var itemsOnPage = await root.Skip(pageSize * pageIndex).Take(pageSize).ToListAsync();

            return new PaginatedItemsViewModel<CatalogItem>(pageIndex, pageSize, totalItems, ChangeUriPlaceholder(itemsOnPage));
        }

        [HttpGet]
        [Route("catalogtypes")]
        [ProducesResponseType(typeof(List<CatalogType>), (int)HttpStatusCode.OK)]
        public async Task<ActionResult<List<CatalogType>>> CatalogTypesAsync()
            => await _catalogContext.CatalogTypes.ToListAsync();

        [HttpGet]
        [Route("catalogbrands")]
        [ProducesResponseType(typeof(List<CatalogBrand>), (int)HttpStatusCode.OK)]
        public async Task<ActionResult<List<CatalogBrand>>> CatalogBrandsAsync()
            => await _catalogContext.CatalogBrands.ToListAsync();

        // PUT api/catalog/items
        [Route("items")]
        [HttpPut]
        [Authorize(Policy = VeloraPolicies.ProductsWrite)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        [ProducesResponseType((int)HttpStatusCode.Created)]
        public async Task<ActionResult> UpdateProductAsync([FromBody] CatalogItem productToUpdate)
        {
            var catalogItem = await _catalogContext.CatalogItems
                .AsTracking()
                .SingleOrDefaultAsync(i => i.Id == productToUpdate.Id);

            if (catalogItem is null)
                return NotFound(new { Message = $"Item with id {productToUpdate.Id} not found." });

            // Copy the mutable fields instead of swapping the tracked instance, so
            // navigation collections and the slug are not wiped out.
            catalogItem.Name = productToUpdate.Name;
            catalogItem.Description = productToUpdate.Description;
            catalogItem.Price = productToUpdate.Price;
            catalogItem.DiscountPrice = productToUpdate.DiscountPrice;
            catalogItem.CatalogBrandId = productToUpdate.CatalogBrandId;
            catalogItem.CatalogTypeId = productToUpdate.CatalogTypeId;
            catalogItem.CategoryId = productToUpdate.CategoryId;
            catalogItem.AvailableStock = productToUpdate.AvailableStock;
            catalogItem.PictureFileName = productToUpdate.PictureFileName;
            catalogItem.IsPublished = productToUpdate.IsPublished;
            catalogItem.UpdatedAtUtc = DateTime.UtcNow;

            await _catalogContext.SaveChangesAsync();

            return CreatedAtAction(nameof(ItemByIdAsync), new { id = productToUpdate.Id }, null);
        }

        // POST api/catalog/items
        [Route("items")]
        [HttpPost]
        [Authorize(Policy = VeloraPolicies.ProductsWrite)]
        [ProducesResponseType((int)HttpStatusCode.Created)]
        public async Task<ActionResult> CreateProductAsync([FromBody] CatalogItem product)
        {
            var taken = (await _catalogContext.CatalogItems.Select(p => p.Slug).ToListAsync())
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var item = new CatalogItem
            {
                CatalogBrandId = product.CatalogBrandId,
                CatalogTypeId = product.CatalogTypeId,
                CategoryId = product.CategoryId,
                Description = product.Description,
                Name = product.Name,
                PictureFileName = product.PictureFileName,
                PictureUri = product.PictureUri,
                Price = product.Price,
                DiscountPrice = product.DiscountPrice,
                AvailableStock = product.AvailableStock,
                IsPublished = product.IsPublished,
                // Slug is mandatory for the storefront routes, so derive one when missing.
                Slug = Slug.Unique(string.IsNullOrWhiteSpace(product.Slug) ? product.Name : product.Slug,
                    candidate => taken.Contains(candidate), "urun")
            };

            _catalogContext.CatalogItems.Add(item);

            await _catalogContext.SaveChangesAsync();

            return CreatedAtAction(nameof(ItemByIdAsync), new { id = item.Id }, null);
        }

        // DELETE api/catalog/{id}
        [Route("{id}")]
        [HttpDelete]
        [Authorize(Policy = VeloraPolicies.ProductsWrite)]
        [ProducesResponseType((int)HttpStatusCode.NoContent)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public async Task<ActionResult> DeleteProductAsync(int id)
        {
            var product = await _catalogContext.CatalogItems.AsTracking().SingleOrDefaultAsync(x => x.Id == id);

            if (product is null) return NotFound();

            _catalogContext.CatalogItems.Remove(product);

            await _catalogContext.SaveChangesAsync();

            return NoContent();
        }

        private List<CatalogItem> ChangeUriPlaceholder(List<CatalogItem> items)
        {
            foreach (var item in items) ApplyPictureUri(item);

            return items;
        }

        /// <summary>
        /// Legacy items store a file name and get the configured base URL prepended.
        /// Velora products already carry an absolute/rooted URL, which is left untouched.
        /// </summary>
        private void ApplyPictureUri(CatalogItem item)
        {
            if (!string.IsNullOrWhiteSpace(item.PictureUri)) return;

            if (!string.IsNullOrWhiteSpace(item.PictureFileName))
                item.PictureUri = _settings.PicBaseUrl + item.PictureFileName;
        }
    }
}
