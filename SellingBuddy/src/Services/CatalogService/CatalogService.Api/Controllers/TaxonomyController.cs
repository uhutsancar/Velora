using CatalogService.Api.Core.Application.Dtos;
using CatalogService.Api.Core.Application.Mapping;
using CatalogService.Api.Infrastructure.Context;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CatalogService.Api.Controllers
{
    /// <summary>Public category tree used by the storefront navigation.</summary>
    [Route("api/categories")]
    [ApiController]
    public class CategoriesController : ControllerBase
    {
        private readonly CatalogContext db;

        public CategoriesController(CatalogContext db) => this.db = db;

        /// <summary>Full active tree with product counts, ready for the mega menu.</summary>
        [HttpGet]
        public async Task<IReadOnlyCollection<CategoryDto>> Tree(CancellationToken ct)
        {
            var categories = await db.Categories.AsNoTracking()
                .Where(c => c.IsActive)
                .OrderBy(c => c.DisplayOrder).ThenBy(c => c.Name)
                .ToListAsync(ct);

            var counts = await db.CatalogItems.AsNoTracking()
                .Where(p => p.IsPublished && p.CategoryId != null)
                .GroupBy(p => p.CategoryId!.Value)
                .Select(g => new { CategoryId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CategoryId, x => x.Count, ct);

            return BuildTree(categories, counts, null);
        }

        [HttpGet("flat")]
        public async Task<IReadOnlyCollection<CategoryDto>> Flat(CancellationToken ct)
        {
            var categories = await db.Categories.AsNoTracking()
                .OrderBy(c => c.DisplayOrder).ThenBy(c => c.Name)
                .ToListAsync(ct);

            return categories.Select(c => ProductMapper.ToCategoryDto(c)).ToList();
        }

        [HttpGet("featured")]
        public async Task<IReadOnlyCollection<CategoryDto>> Featured(CancellationToken ct)
        {
            var categories = await db.Categories.AsNoTracking()
                .Where(c => c.IsActive && c.IsFeatured)
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync(ct);

            return categories.Select(c => ProductMapper.ToCategoryDto(c)).ToList();
        }

        [HttpGet("{slug}")]
        public async Task<ActionResult<CategoryDto>> GetBySlug(string slug, CancellationToken ct)
        {
            var category = await db.Categories.AsNoTracking()
                .Include(c => c.Children.Where(child => child.IsActive))
                .FirstOrDefaultAsync(c => c.Slug == slug && c.IsActive, ct);

            if (category is null) return NotFound();

            var dto = ProductMapper.ToCategoryDto(category);
            dto.Children = category.Children
                .OrderBy(c => c.DisplayOrder)
                .Select(c => ProductMapper.ToCategoryDto(c))
                .ToList();

            return dto;
        }

        /// <summary>Recursively assembles the subtree under <paramref name="parentId"/>.</summary>
        private static List<CategoryDto> BuildTree(
            List<Core.Domain.Category> categories,
            IReadOnlyDictionary<int, int> counts,
            int? parentId)
        {
            return categories
                .Where(c => c.ParentId == parentId)
                .Select(c =>
                {
                    var dto = ProductMapper.ToCategoryDto(c, counts.GetValueOrDefault(c.Id));
                    dto.Children = BuildTree(categories, counts, c.Id);
                    // A parent's count includes everything underneath it.
                    dto.ProductCount += dto.Children.Sum(child => child.ProductCount);
                    return dto;
                })
                .ToList();
        }
    }

    /// <summary>Public brand directory.</summary>
    [Route("api/brands")]
    [ApiController]
    public class BrandsController : ControllerBase
    {
        private readonly CatalogContext db;

        public BrandsController(CatalogContext db) => this.db = db;

        [HttpGet]
        public async Task<IReadOnlyCollection<BrandDto>> List([FromQuery] bool featuredOnly = false, CancellationToken ct = default)
        {
            var query = db.CatalogBrands.AsNoTracking().Where(b => b.IsActive);

            if (featuredOnly) query = query.Where(b => b.IsFeatured);

            var brands = await query.OrderBy(b => b.DisplayOrder).ThenBy(b => b.Brand).ToListAsync(ct);

            var counts = await db.CatalogItems.AsNoTracking()
                .Where(p => p.IsPublished)
                .GroupBy(p => p.CatalogBrandId)
                .Select(g => new { BrandId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.BrandId, x => x.Count, ct);

            return brands.Select(b => ProductMapper.ToBrandDto(b, counts.GetValueOrDefault(b.Id))).ToList();
        }

        [HttpGet("{slug}")]
        public async Task<ActionResult<BrandDto>> GetBySlug(string slug, CancellationToken ct)
        {
            var brand = await db.CatalogBrands.AsNoTracking()
                .FirstOrDefaultAsync(b => b.IsActive && (b.Slug == slug || b.Brand == slug), ct);

            if (brand is null) return NotFound();

            var count = await db.CatalogItems.CountAsync(p => p.IsPublished && p.CatalogBrandId == brand.Id, ct);

            return ProductMapper.ToBrandDto(brand, count);
        }
    }
}
