using CatalogService.Api.Core.Application.Dtos;
using CatalogService.Api.Core.Application.Mapping;
using CatalogService.Api.Core.Application.Services;
using CatalogService.Api.Core.Domain;
using CatalogService.Api.Infrastructure.Context;
using Microsoft.EntityFrameworkCore;
using Velora.Shared.Contracts;
using Velora.Shared.Text;

namespace CatalogService.Api.Infrastructure.Services
{
    public sealed class ProductQueryService : IProductQueryService
    {
        private readonly CatalogContext db;

        public ProductQueryService(CatalogContext db)
        {
            this.db = db;
        }

        public async Task<PagedResult<ProductListItemDto>> Search(ProductQuery query, CancellationToken ct = default)
        {
            var filtered = await ApplyFilters(PublishedProducts(), query, ct);

            var total = await filtered.LongCountAsync(ct);

            var items = await ApplySort(filtered, query.Sort)
                .Skip(query.PageIndex * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync(ct);

            return new PagedResult<ProductListItemDto>(
                items.Select(ProductMapper.ToListItem).ToList(),
                query.PageIndex,
                query.PageSize,
                total);
        }

        public async Task<ProductDetailDto?> GetBySlug(string slug, CancellationToken ct = default)
        {
            var product = await PublishedProducts().FirstOrDefaultAsync(p => p.Slug == slug, ct);

            if (product is null) return null;

            var breadcrumbs = await BuildBreadcrumbs(product.CategoryId, ct);

            return ProductMapper.ToDetail(product, breadcrumbs);
        }

        public async Task<IReadOnlyCollection<ProductListItemDto>> GetRelated(string slug, int take = 8, CancellationToken ct = default)
        {
            var product = await db.CatalogItems.AsNoTracking()
                .Where(p => p.Slug == slug)
                .Select(p => new { p.Id, p.CategoryId, p.CatalogBrandId })
                .FirstOrDefaultAsync(ct);

            if (product is null) return Array.Empty<ProductListItemDto>();

            // Prefer same category, then same brand, then anything else recent.
            var items = await PublishedProducts()
                .Where(p => p.Id != product.Id)
                .OrderByDescending(p => p.CategoryId == product.CategoryId)
                .ThenByDescending(p => p.CatalogBrandId == product.CatalogBrandId)
                .ThenByDescending(p => p.SoldCount)
                .Take(take)
                .ToListAsync(ct);

            return items.Select(ProductMapper.ToListItem).ToList();
        }

        public async Task<IReadOnlyCollection<ProductListItemDto>> GetFeatured(int take = 8, CancellationToken ct = default)
        {
            var items = await PublishedProducts()
                .Where(p => p.IsFeatured)
                .OrderByDescending(p => p.SoldCount)
                .Take(take)
                .ToListAsync(ct);

            return items.Select(ProductMapper.ToListItem).ToList();
        }

        public async Task<IReadOnlyCollection<ProductListItemDto>> GetNewArrivals(int take = 8, CancellationToken ct = default)
        {
            var items = await PublishedProducts()
                .OrderByDescending(p => p.CreatedAtUtc)
                .Take(take)
                .ToListAsync(ct);

            return items.Select(ProductMapper.ToListItem).ToList();
        }

        public async Task<IReadOnlyCollection<ProductListItemDto>> GetBestSellers(int take = 8, CancellationToken ct = default)
        {
            var items = await PublishedProducts()
                .OrderByDescending(p => p.SoldCount)
                .ThenByDescending(p => p.RatingAverage)
                .Take(take)
                .ToListAsync(ct);

            return items.Select(ProductMapper.ToListItem).ToList();
        }

        public async Task<IReadOnlyCollection<ProductListItemDto>> GetByIds(IReadOnlyCollection<int> ids, CancellationToken ct = default)
        {
            if (ids.Count == 0) return Array.Empty<ProductListItemDto>();

            var items = await PublishedProducts()
                .Where(p => ids.Contains(p.Id))
                .ToListAsync(ct);

            // Preserve the caller's ordering (wishlist / recently viewed lists rely on it).
            var byId = items.ToDictionary(p => p.Id);

            return ids.Where(byId.ContainsKey).Select(id => ProductMapper.ToListItem(byId[id])).ToList();
        }

        public async Task<ProductFacetsDto> GetFacets(ProductQuery query, CancellationToken ct = default)
        {
            // Facets ignore the price filter so the slider bounds stay stable while filtering.
            var facetQuery = new ProductQuery
            {
                Search = query.Search,
                Category = query.Category,
                Tag = query.Tag,
                Featured = query.Featured
            };

            var scoped = await ApplyFilters(PublishedProducts(), facetQuery, ct);
            var products = await scoped.ToListAsync(ct);

            if (products.Count == 0)
                return new ProductFacetsDto();

            return new ProductFacetsDto
            {
                MinPrice = products.Min(p => p.EffectivePrice),
                MaxPrice = products.Max(p => p.EffectivePrice),
                Brands = products
                    .Where(p => p.CatalogBrand != null)
                    .GroupBy(p => new { p.CatalogBrand!.Slug, p.CatalogBrand!.Brand })
                    .Select(g => new FacetValueDto
                    {
                        Value = g.Key.Slug ?? g.Key.Brand,
                        Label = g.Key.Brand,
                        Count = g.Count()
                    })
                    .OrderByDescending(f => f.Count).ThenBy(f => f.Label)
                    .ToList(),
                Categories = products
                    .Where(p => p.Category != null)
                    .GroupBy(p => new { p.Category!.Slug, p.Category!.Name })
                    .Select(g => new FacetValueDto { Value = g.Key.Slug, Label = g.Key.Name, Count = g.Count() })
                    .OrderByDescending(f => f.Count).ThenBy(f => f.Label)
                    .ToList(),
                Colors = products
                    .SelectMany(p => p.Variants.Where(v => v.IsActive && v.Color != null).Select(v => new { v.Color, v.ColorHex, p.Id }))
                    .GroupBy(v => v.Color!)
                    .Select(g => new FacetValueDto { Value = g.Key, Label = g.Key, Count = g.Select(x => x.Id).Distinct().Count() })
                    .OrderBy(f => f.Label)
                    .ToList(),
                Sizes = products
                    .SelectMany(p => p.Variants.Where(v => v.IsActive && v.Size != null).Select(v => new { v.Size, p.Id }))
                    .GroupBy(v => v.Size!)
                    .Select(g => new FacetValueDto { Value = g.Key, Label = g.Key, Count = g.Select(x => x.Id).Distinct().Count() })
                    .OrderBy(f => f.Label)
                    .ToList()
            };
        }

        public Task IncrementViewCount(int productId, CancellationToken ct = default) =>
            db.CatalogItems
                .Where(p => p.Id == productId)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.ViewCount, p => p.ViewCount + 1), ct);

        private IQueryable<CatalogItem> PublishedProducts() =>
            db.CatalogItems
                .AsNoTracking()
                .AsSplitQuery()
                .Include(p => p.CatalogBrand)
                .Include(p => p.Category)
                .Include(p => p.Images)
                .Include(p => p.Variants)
                .Where(p => p.IsPublished);

        /// <summary>
        /// Shared filter pipeline. Category filtering resolves the whole subtree so
        /// "kadin" also returns everything under "kadin/giyim/ceket".
        /// </summary>
        private async Task<IQueryable<CatalogItem>> ApplyFilters(IQueryable<CatalogItem> source, ProductQuery query, CancellationToken ct)
        {
            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var term = query.Search.Trim().ToLower();

                // SQL Server's default collation is accent sensitive, so "canta" would
                // never match "Çanta". The slug is already diacritic-folded, so matching
                // the slugified term against it makes diacritic-free search work.
                var foldedTerm = Slug.From(query.Search);

                source = source.Where(p =>
                    p.Name.ToLower().Contains(term) ||
                    p.Description.ToLower().Contains(term) ||
                    (foldedTerm != string.Empty && p.Slug.Contains(foldedTerm)) ||
                    (p.Tags != null && p.Tags.ToLower().Contains(term)) ||
                    (p.Sku != null && p.Sku.ToLower().Contains(term)) ||
                    p.CatalogBrand.Brand.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(query.Category))
            {
                var categoryIds = await ResolveCategorySubtree(query.Category, ct);
                source = categoryIds.Count == 0
                    ? source.Where(_ => false)
                    : source.Where(p => p.CategoryId != null && categoryIds.Contains(p.CategoryId.Value));
            }

            if (!string.IsNullOrWhiteSpace(query.Brand))
            {
                var brandSlugs = query.Brand.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                source = source.Where(p => brandSlugs.Contains(p.CatalogBrand.Slug) || brandSlugs.Contains(p.CatalogBrand.Brand));
            }

            if (query.MinPrice is { } min)
                source = source.Where(p => (p.DiscountPrice ?? p.Price) >= min);

            if (query.MaxPrice is { } max)
                source = source.Where(p => (p.DiscountPrice ?? p.Price) <= max);

            if (!string.IsNullOrWhiteSpace(query.Color))
            {
                var colors = query.Color.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                source = source.Where(p => p.Variants.Any(v => v.IsActive && v.Color != null && colors.Contains(v.Color)));
            }

            if (!string.IsNullOrWhiteSpace(query.Size))
            {
                var sizes = query.Size.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                source = source.Where(p => p.Variants.Any(v => v.IsActive && v.Size != null && sizes.Contains(v.Size)));
            }

            if (!string.IsNullOrWhiteSpace(query.Tag))
            {
                var tag = query.Tag.Trim().ToLower();
                source = source.Where(p => p.Tags != null && p.Tags.ToLower().Contains(tag));
            }

            if (query.InStock == true)
                source = source.Where(p => p.AvailableStock > 0 || p.Variants.Any(v => v.IsActive && v.Stock > 0));

            if (query.OnSale == true)
                source = source.Where(p => p.DiscountPrice != null && p.DiscountPrice > 0 && p.DiscountPrice < p.Price);

            if (query.Featured == true)
                source = source.Where(p => p.IsFeatured);

            if (query.MinRating is { } rating and > 0)
                source = source.Where(p => p.RatingAverage >= rating);

            return source;
        }

        private static IQueryable<CatalogItem> ApplySort(IQueryable<CatalogItem> source, ProductSort sort) => sort switch
        {
            ProductSort.PriceAsc => source.OrderBy(p => p.DiscountPrice ?? p.Price).ThenBy(p => p.Id),
            ProductSort.PriceDesc => source.OrderByDescending(p => p.DiscountPrice ?? p.Price).ThenBy(p => p.Id),
            ProductSort.Rating => source.OrderByDescending(p => p.RatingAverage).ThenByDescending(p => p.RatingCount).ThenBy(p => p.Id),
            ProductSort.BestSelling => source.OrderByDescending(p => p.SoldCount).ThenBy(p => p.Id),
            ProductSort.NameAsc => source.OrderBy(p => p.Name).ThenBy(p => p.Id),
            _ => source.OrderByDescending(p => p.CreatedAtUtc).ThenByDescending(p => p.Id)
        };

        private async Task<List<int>> ResolveCategorySubtree(string slugOrId, CancellationToken ct)
        {
            var categories = await db.Categories.AsNoTracking()
                .Select(c => new { c.Id, c.Slug, c.ParentId })
                .ToListAsync(ct);

            var root = int.TryParse(slugOrId, out var id)
                ? categories.FirstOrDefault(c => c.Id == id)
                : categories.FirstOrDefault(c => c.Slug == slugOrId);

            if (root is null) return new List<int>();

            var byParent = categories.ToLookup(c => c.ParentId);
            var result = new List<int>();
            var stack = new Stack<int>();
            stack.Push(root.Id);

            while (stack.Count > 0)
            {
                var current = stack.Pop();
                result.Add(current);

                foreach (var child in byParent[current])
                    stack.Push(child.Id);
            }

            return result;
        }

        private async Task<IReadOnlyCollection<CategoryBreadcrumbDto>> BuildBreadcrumbs(int? categoryId, CancellationToken ct)
        {
            if (categoryId is null) return Array.Empty<CategoryBreadcrumbDto>();

            var categories = await db.Categories.AsNoTracking()
                .Select(c => new CategoryNode(c.Id, c.Name, c.Slug, c.ParentId))
                .ToListAsync(ct);

            var byId = categories.ToDictionary(c => c.Id);
            var trail = new List<CategoryBreadcrumbDto>();
            var cursor = categoryId;

            while (cursor is { } current && byId.TryGetValue(current, out var node))
            {
                trail.Insert(0, new CategoryBreadcrumbDto { Id = node.Id, Name = node.Name, Slug = node.Slug });
                cursor = node.ParentId;
            }

            return trail;
        }

        private sealed record CategoryNode(int Id, string Name, string Slug, int? ParentId);
    }
}
