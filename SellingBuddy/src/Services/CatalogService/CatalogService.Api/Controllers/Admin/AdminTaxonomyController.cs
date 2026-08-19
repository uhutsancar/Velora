using CatalogService.Api.Core.Application.Dtos;
using CatalogService.Api.Core.Application.Mapping;
using CatalogService.Api.Core.Domain;
using CatalogService.Api.Infrastructure.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Velora.Shared.Middleware;
using Velora.Shared.Security;
using Velora.Shared.Text;

namespace CatalogService.Api.Controllers.Admin
{
    [Route("api/admin/categories")]
    [ApiController]
    [Authorize(Policy = VeloraPolicies.CategoriesWrite)]
    public class AdminCategoriesController : ControllerBase
    {
        private readonly CatalogContext db;

        public AdminCategoriesController(CatalogContext db) => this.db = db;

        [HttpGet]
        public async Task<IReadOnlyCollection<CategoryDto>> List(CancellationToken ct)
        {
            var categories = await db.Categories.AsNoTracking()
                .OrderBy(c => c.DisplayOrder).ThenBy(c => c.Name)
                .ToListAsync(ct);

            var counts = await db.CatalogItems.AsNoTracking()
                .Where(p => p.CategoryId != null)
                .GroupBy(p => p.CategoryId!.Value)
                .Select(g => new { CategoryId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CategoryId, x => x.Count, ct);

            return categories.Select(c => ProductMapper.ToCategoryDto(c, counts.GetValueOrDefault(c.Id))).ToList();
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<CategoryDto>> GetById(int id, CancellationToken ct)
        {
            var category = await db.Categories.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
            return category is null ? NotFound() : ProductMapper.ToCategoryDto(category);
        }

        [HttpPost]
        public async Task<ActionResult<CategoryDto>> Create([FromBody] CategoryRequest request, CancellationToken ct)
        {
            await EnsureParentIsValid(request.ParentId, null, ct);

            var category = new Category { Slug = await UniqueSlug(request.Slug ?? request.Name, null, ct) };
            Apply(category, request);

            db.Categories.Add(category);
            await db.SaveChangesAsync(ct);

            return CreatedAtAction(nameof(GetById), new { id = category.Id }, ProductMapper.ToCategoryDto(category));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<CategoryDto>> Update(int id, [FromBody] CategoryRequest request, CancellationToken ct)
        {
            var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (category is null) return NotFound();

            await EnsureParentIsValid(request.ParentId, id, ct);

            if (!string.IsNullOrWhiteSpace(request.Slug) && request.Slug != category.Slug)
                category.Slug = await UniqueSlug(request.Slug, id, ct);

            Apply(category, request);
            category.UpdatedAtUtc = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);

            return ProductMapper.ToCategoryDto(category);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (category is null) return NotFound();

            if (await db.Categories.AnyAsync(c => c.ParentId == id, ct))
                throw new ApiException("Alt kategorisi olan bir kategori silinemez.", 409, "category_has_children");

            // Products survive: the FK is configured as SetNull.
            db.Categories.Remove(category);
            await db.SaveChangesAsync(ct);

            return NoContent();
        }

        private static void Apply(Category category, CategoryRequest request)
        {
            category.Name = request.Name.Trim();
            category.Description = request.Description;
            category.ParentId = request.ParentId;
            category.ImageUrl = request.ImageUrl;
            category.DisplayOrder = request.DisplayOrder;
            category.IsActive = request.IsActive;
            category.IsFeatured = request.IsFeatured;
            category.MetaTitle = request.MetaTitle ?? request.Name;
            category.MetaDescription = request.MetaDescription;
        }

        /// <summary>Rejects self-parenting and cycles, which would break the tree walk.</summary>
        private async Task EnsureParentIsValid(int? parentId, int? categoryId, CancellationToken ct)
        {
            if (parentId is null) return;

            if (parentId == categoryId)
                throw new ApiException("Bir kategori kendi üst kategorisi olamaz.", 400, "invalid_parent");

            var all = await db.Categories.AsNoTracking().Select(c => new { c.Id, c.ParentId }).ToListAsync(ct);
            var byId = all.ToDictionary(c => c.Id, c => c.ParentId);

            if (!byId.ContainsKey(parentId.Value))
                throw new ApiException("Seçilen üst kategori bulunamadı.", 400, "invalid_parent");

            if (categoryId is null) return;

            var cursor = parentId;
            while (cursor is { } current)
            {
                if (current == categoryId)
                    throw new ApiException("Kategori döngüsü oluşturulamaz.", 400, "category_cycle");

                cursor = byId.GetValueOrDefault(current);
            }
        }

        private async Task<string> UniqueSlug(string source, int? excludeId, CancellationToken ct)
        {
            var taken = (await db.Categories
                    .Where(c => excludeId == null || c.Id != excludeId)
                    .Select(c => c.Slug)
                    .ToListAsync(ct))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            return Slug.Unique(source, candidate => taken.Contains(candidate), "kategori");
        }
    }

    [Route("api/admin/brands")]
    [ApiController]
    [Authorize(Policy = VeloraPolicies.BrandsWrite)]
    public class AdminBrandsController : ControllerBase
    {
        private readonly CatalogContext db;

        public AdminBrandsController(CatalogContext db) => this.db = db;

        [HttpGet]
        public async Task<IReadOnlyCollection<BrandDto>> List(CancellationToken ct)
        {
            var brands = await db.CatalogBrands.AsNoTracking()
                .OrderBy(b => b.DisplayOrder).ThenBy(b => b.Brand)
                .ToListAsync(ct);

            var counts = await db.CatalogItems.AsNoTracking()
                .GroupBy(p => p.CatalogBrandId)
                .Select(g => new { BrandId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.BrandId, x => x.Count, ct);

            return brands.Select(b => ProductMapper.ToBrandDto(b, counts.GetValueOrDefault(b.Id))).ToList();
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<BrandDto>> GetById(int id, CancellationToken ct)
        {
            var brand = await db.CatalogBrands.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id, ct);
            return brand is null ? NotFound() : ProductMapper.ToBrandDto(brand);
        }

        [HttpPost]
        public async Task<ActionResult<BrandDto>> Create([FromBody] BrandRequest request, CancellationToken ct)
        {
            var brand = new CatalogBrand { Slug = await UniqueSlug(request.Slug ?? request.Name, null, ct) };
            Apply(brand, request);

            db.CatalogBrands.Add(brand);
            await db.SaveChangesAsync(ct);

            return CreatedAtAction(nameof(GetById), new { id = brand.Id }, ProductMapper.ToBrandDto(brand));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<BrandDto>> Update(int id, [FromBody] BrandRequest request, CancellationToken ct)
        {
            var brand = await db.CatalogBrands.FirstOrDefaultAsync(b => b.Id == id, ct);
            if (brand is null) return NotFound();

            if (!string.IsNullOrWhiteSpace(request.Slug) && request.Slug != brand.Slug)
                brand.Slug = await UniqueSlug(request.Slug, id, ct);

            Apply(brand, request);
            await db.SaveChangesAsync(ct);

            return ProductMapper.ToBrandDto(brand);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var brand = await db.CatalogBrands.FirstOrDefaultAsync(b => b.Id == id, ct);
            if (brand is null) return NotFound();

            if (await db.CatalogItems.AnyAsync(p => p.CatalogBrandId == id, ct))
                throw new ApiException("Ürünü bulunan bir marka silinemez.", 409, "brand_in_use");

            db.CatalogBrands.Remove(brand);
            await db.SaveChangesAsync(ct);

            return NoContent();
        }

        private static void Apply(CatalogBrand brand, BrandRequest request)
        {
            brand.Brand = request.Name.Trim();
            brand.Description = request.Description;
            brand.LogoUrl = request.LogoUrl;
            brand.IsActive = request.IsActive;
            brand.IsFeatured = request.IsFeatured;
            brand.DisplayOrder = request.DisplayOrder;
        }

        private async Task<string> UniqueSlug(string source, int? excludeId, CancellationToken ct)
        {
            var taken = (await db.CatalogBrands
                    .Where(b => excludeId == null || b.Id != excludeId)
                    .Select(b => b.Slug)
                    .ToListAsync(ct))
                .Where(s => s != null)
                .ToHashSet(StringComparer.OrdinalIgnoreCase)!;

            return Slug.Unique(source, candidate => taken.Contains(candidate), "marka");
        }
    }
}
