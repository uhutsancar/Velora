using CatalogService.Api.Core.Application.Dtos;
using CatalogService.Api.Core.Application.Mapping;
using CatalogService.Api.Core.Application.Services;
using CatalogService.Api.Core.Domain;
using CatalogService.Api.Infrastructure.Context;
using CatalogService.Api.IntegrationEvents.Events;
using EventBus.Base.Abstraction;
using Microsoft.EntityFrameworkCore;
using Velora.Shared.Contracts;
using Velora.Shared.Middleware;
using Velora.Shared.Text;

namespace CatalogService.Api.Infrastructure.Services
{
    public sealed class ProductAdminService : IProductAdminService
    {
        private readonly CatalogContext db;
        private readonly IEventBus eventBus;
        private readonly ILogger<ProductAdminService> logger;

        public ProductAdminService(CatalogContext db, IEventBus eventBus, ILogger<ProductAdminService> logger)
        {
            this.db = db;
            this.eventBus = eventBus;
            this.logger = logger;
        }

        public async Task<PagedResult<ProductListItemDto>> Search(AdminProductQuery query, CancellationToken ct = default)
        {
            var source = ProductsWithGraph();

            if (query.Published is { } published)
                source = source.Where(p => p.IsPublished == published);

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var term = query.Search.Trim().ToLower();
                source = source.Where(p =>
                    p.Name.ToLower().Contains(term) ||
                    (p.Sku != null && p.Sku.ToLower().Contains(term)) ||
                    p.CatalogBrand.Brand.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(query.Category) && int.TryParse(query.Category, out var categoryId))
                source = source.Where(p => p.CategoryId == categoryId);

            if (query.LowStock == true)
                source = source.Where(p => p.AvailableStock <= p.RestockThreshold);

            if (query.OnSale == true)
                source = source.Where(p => p.DiscountPrice != null && p.DiscountPrice < p.Price);

            var total = await source.LongCountAsync(ct);

            var items = await (query.Sort switch
                {
                    ProductSort.PriceAsc => source.OrderBy(p => p.Price),
                    ProductSort.PriceDesc => source.OrderByDescending(p => p.Price),
                    ProductSort.NameAsc => source.OrderBy(p => p.Name),
                    ProductSort.BestSelling => source.OrderByDescending(p => p.SoldCount),
                    _ => source.OrderByDescending(p => p.UpdatedAtUtc ?? p.CreatedAtUtc)
                })
                .Skip(query.PageIndex * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync(ct);

            return new PagedResult<ProductListItemDto>(
                items.Select(ProductMapper.ToListItem).ToList(), query.PageIndex, query.PageSize, total);
        }

        public async Task<AdminProductDetailDto?> GetById(int id, CancellationToken ct = default)
        {
            var product = await ProductsWithGraph().FirstOrDefaultAsync(p => p.Id == id, ct);

            return product is null ? null : ProductMapper.ToAdminDetail(product, await BuildBreadcrumbs(product.CategoryId, ct));
        }

        public async Task<AdminProductDetailDto> Create(CreateProductRequest request, CancellationToken ct = default)
        {
            await EnsureReferencesExist(request, ct);

            var product = new CatalogItem
            {
                Slug = await UniqueSlug(request.Slug ?? request.Name, null, ct),
                PictureFileName = string.Empty,
                PictureUri = request.Images.FirstOrDefault()?.Url ?? string.Empty,
                CreatedAtUtc = DateTime.UtcNow
            };

            ApplyRequest(product, request);

            db.CatalogItems.Add(product);
            await db.SaveChangesAsync(ct);

            await ReplaceImages(product, request.Images, ct);
            await ReplaceVariants(product, request.Variants, ct);

            await db.SaveChangesAsync(ct);

            logger.LogInformation("Product {ProductId} ({Slug}) created.", product.Id, product.Slug);

            return (await GetById(product.Id, ct))!;
        }

        public async Task<AdminProductDetailDto> Update(int id, UpdateProductRequest request, CancellationToken ct = default)
        {
            var product = await db.CatalogItems
                .Include(p => p.Images)
                .Include(p => p.Variants)
                .FirstOrDefaultAsync(p => p.Id == id, ct)
                ?? throw new ApiException($"Product {id} was not found.", 404, "not_found");

            await EnsureReferencesExist(request, ct);

            var oldPrice = product.EffectivePrice;
            var oldStock = product.TotalStock;

            if (!string.IsNullOrWhiteSpace(request.Slug) && request.Slug != product.Slug)
                product.Slug = await UniqueSlug(request.Slug, product.Id, ct);

            ApplyRequest(product, request);
            product.UpdatedAtUtc = DateTime.UtcNow;

            await ReplaceImages(product, request.Images, ct);
            await ReplaceVariants(product, request.Variants, ct);

            await db.SaveChangesAsync(ct);

            PublishPriceChange(product, oldPrice);
            PublishStockChange(product, oldStock);

            return (await GetById(product.Id, ct))!;
        }

        public async Task Delete(int id, CancellationToken ct = default)
        {
            var product = await db.CatalogItems.FirstOrDefaultAsync(p => p.Id == id, ct)
                          ?? throw new ApiException($"Product {id} was not found.", 404, "not_found");

            db.CatalogItems.Remove(product);
            await db.SaveChangesAsync(ct);

            logger.LogInformation("Product {ProductId} deleted.", id);
        }

        public async Task SetPublishState(int id, bool isPublished, CancellationToken ct = default)
        {
            var affected = await db.CatalogItems
                .Where(p => p.Id == id)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(p => p.IsPublished, isPublished)
                    .SetProperty(p => p.UpdatedAtUtc, DateTime.UtcNow), ct);

            if (affected == 0)
                throw new ApiException($"Product {id} was not found.", 404, "not_found");
        }

        public async Task UpdateStock(int id, UpdateStockRequest request, CancellationToken ct = default)
        {
            var product = await db.CatalogItems.Include(p => p.Variants).FirstOrDefaultAsync(p => p.Id == id, ct)
                          ?? throw new ApiException($"Product {id} was not found.", 404, "not_found");

            var oldStock = product.TotalStock;

            product.AvailableStock = request.AvailableStock;
            product.UpdatedAtUtc = DateTime.UtcNow;

            foreach (var variantRequest in request.Variants)
            {
                var variant = product.Variants.FirstOrDefault(v => v.Id == variantRequest.Id);
                if (variant is not null) variant.Stock = variantRequest.Stock;
            }

            await db.SaveChangesAsync(ct);

            PublishStockChange(product, oldStock);
        }

        public async Task UpdatePricing(int id, UpdatePricingRequest request, CancellationToken ct = default)
        {
            var product = await db.CatalogItems.Include(p => p.Variants).FirstOrDefaultAsync(p => p.Id == id, ct)
                          ?? throw new ApiException($"Product {id} was not found.", 404, "not_found");

            if (request.DiscountPrice is { } discount && discount >= request.Price)
                throw new ApiException("The discounted price must be lower than the list price.", 400, "invalid_pricing");

            var oldPrice = product.EffectivePrice;

            product.Price = request.Price;
            product.DiscountPrice = request.DiscountPrice;
            product.UpdatedAtUtc = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);

            PublishPriceChange(product, oldPrice);
        }

        public async Task<ProductImageDto> AddImage(int id, ProductImageRequest request, CancellationToken ct = default)
        {
            var product = await db.CatalogItems.Include(p => p.Images).FirstOrDefaultAsync(p => p.Id == id, ct)
                          ?? throw new ApiException($"Product {id} was not found.", 404, "not_found");

            var isFirst = product.Images.Count == 0;

            var image = new ProductImage
            {
                CatalogItemId = product.Id,
                Url = request.Url,
                AltText = request.AltText ?? product.Name,
                DisplayOrder = request.DisplayOrder > 0 ? request.DisplayOrder : product.Images.Count,
                IsPrimary = request.IsPrimary || isFirst
            };

            if (image.IsPrimary)
                foreach (var existing in product.Images) existing.IsPrimary = false;

            db.ProductImages.Add(image);
            product.UpdatedAtUtc = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);
            await SyncLegacyPicture(product.Id, ct);

            return ProductMapper.ToImageDto(image);
        }

        public async Task DeleteImage(int id, int imageId, CancellationToken ct = default)
        {
            var product = await db.CatalogItems.Include(p => p.Images).FirstOrDefaultAsync(p => p.Id == id, ct)
                          ?? throw new ApiException($"Product {id} was not found.", 404, "not_found");

            var image = product.Images.FirstOrDefault(i => i.Id == imageId)
                        ?? throw new ApiException($"Image {imageId} was not found.", 404, "not_found");

            db.ProductImages.Remove(image);
            product.UpdatedAtUtc = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);

            // Never leave the gallery without a primary image.
            if (image.IsPrimary)
            {
                var next = await db.ProductImages
                    .Where(i => i.CatalogItemId == id)
                    .OrderBy(i => i.DisplayOrder)
                    .FirstOrDefaultAsync(ct);

                if (next is not null)
                {
                    next.IsPrimary = true;
                    await db.SaveChangesAsync(ct);
                }
            }

            await SyncLegacyPicture(id, ct);
        }

        public async Task ReorderImages(int id, IReadOnlyList<int> imageIds, CancellationToken ct = default)
        {
            var images = await db.ProductImages.Where(i => i.CatalogItemId == id).ToListAsync(ct);

            if (images.Count == 0)
                throw new ApiException($"Product {id} has no images.", 404, "not_found");

            for (var index = 0; index < imageIds.Count; index++)
            {
                var image = images.FirstOrDefault(i => i.Id == imageIds[index]);
                if (image is not null) image.DisplayOrder = index;
            }

            await db.SaveChangesAsync(ct);
        }

        public async Task SetPrimaryImage(int id, int imageId, CancellationToken ct = default)
        {
            var images = await db.ProductImages.Where(i => i.CatalogItemId == id).ToListAsync(ct);

            if (images.All(i => i.Id != imageId))
                throw new ApiException($"Image {imageId} was not found.", 404, "not_found");

            foreach (var image in images) image.IsPrimary = image.Id == imageId;

            await db.SaveChangesAsync(ct);
            await SyncLegacyPicture(id, ct);
        }

        public async Task<CatalogStatsDto> GetStats(CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;

            var products = await db.CatalogItems.AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.CatalogBrand)
                .Include(p => p.Images)
                .Include(p => p.Variants)
                .ToListAsync(ct);

            var lowStock = products
                .Where(p => p.TotalStock <= p.RestockThreshold)
                .OrderBy(p => p.TotalStock)
                .Take(10)
                .Select(ProductMapper.ToListItem)
                .ToList();

            return new CatalogStatsDto
            {
                TotalProducts = products.Count,
                PublishedProducts = products.Count(p => p.IsPublished),
                OutOfStockProducts = products.Count(p => p.TotalStock == 0),
                LowStockProducts = products.Count(p => p.TotalStock > 0 && p.TotalStock <= p.RestockThreshold),
                TotalCategories = await db.Categories.CountAsync(ct),
                TotalBrands = await db.CatalogBrands.CountAsync(ct),
                ActiveCoupons = await db.Coupons.CountAsync(c => c.IsActive && c.StartsAtUtc <= now && c.EndsAtUtc >= now, ct),
                PendingReviews = await db.ProductReviews.CountAsync(r => !r.IsApproved, ct),
                InventoryValue = Math.Round(products.Sum(p => p.TotalStock * (p.CostPrice ?? p.EffectivePrice)), 2),
                PotentialMargin = Math.Round(products.Sum(p => p.TotalStock * (p.EffectivePrice - (p.CostPrice ?? 0))), 2),
                LowStockItems = lowStock,
                ProductsByCategory = products
                    .GroupBy(p => p.Category?.Name ?? "Kategorisiz")
                    .Select(g => new CategoryProductCountDto { Category = g.Key, Count = g.Count() })
                    .OrderByDescending(g => g.Count)
                    .ToList()
            };
        }

        // ---------- helpers ----------

        private IQueryable<CatalogItem> ProductsWithGraph() =>
            db.CatalogItems.AsNoTracking().AsSplitQuery()
                .Include(p => p.CatalogBrand)
                .Include(p => p.CatalogType)
                .Include(p => p.Category)
                .Include(p => p.Images)
                .Include(p => p.Variants);

        private void ApplyRequest(CatalogItem product, CreateProductRequest request)
        {
            if (request.DiscountPrice is { } discount && discount >= request.Price)
                throw new ApiException("The discounted price must be lower than the list price.", 400, "invalid_pricing");

            product.Name = request.Name.Trim();
            product.Description = request.Description;
            product.ShortDescription = request.ShortDescription;
            product.Price = request.Price;
            product.DiscountPrice = request.DiscountPrice;
            product.CostPrice = request.CostPrice;
            product.Sku = string.IsNullOrWhiteSpace(request.Sku) ? null : request.Sku.Trim().ToUpperInvariant();
            product.Barcode = request.Barcode;
            product.CategoryId = request.CategoryId;
            product.CatalogBrandId = request.CatalogBrandId;
            product.CatalogTypeId = request.CatalogTypeId;
            product.AvailableStock = request.AvailableStock;
            product.RestockThreshold = request.RestockThreshold;
            product.IsPublished = request.IsPublished;
            product.IsFeatured = request.IsFeatured;
            product.MetaTitle = request.MetaTitle ?? request.Name;
            product.MetaDescription = request.MetaDescription ?? request.ShortDescription;
            product.Tags = ProductMapper.JoinTags(request.Tags);
        }

        private async Task EnsureReferencesExist(CreateProductRequest request, CancellationToken ct)
        {
            if (!await db.CatalogBrands.AnyAsync(b => b.Id == request.CatalogBrandId, ct))
                throw new ApiException("The selected brand does not exist.", 400, "invalid_brand");

            if (!await db.CatalogTypes.AnyAsync(t => t.Id == request.CatalogTypeId, ct))
                throw new ApiException("The selected product type does not exist.", 400, "invalid_type");

            if (request.CategoryId is { } categoryId && !await db.Categories.AnyAsync(c => c.Id == categoryId, ct))
                throw new ApiException("The selected category does not exist.", 400, "invalid_category");
        }

        private async Task<string> UniqueSlug(string source, int? excludeId, CancellationToken ct)
        {
            var taken = await db.CatalogItems
                .Where(p => excludeId == null || p.Id != excludeId)
                .Select(p => p.Slug)
                .ToListAsync(ct);

            var set = taken.ToHashSet(StringComparer.OrdinalIgnoreCase);

            return Slug.Unique(source, candidate => set.Contains(candidate), "urun");
        }

        private async Task ReplaceImages(CatalogItem product, List<ProductImageRequest> images, CancellationToken ct)
        {
            var existing = await db.ProductImages.Where(i => i.CatalogItemId == product.Id).ToListAsync(ct);
            db.ProductImages.RemoveRange(existing);

            var order = 0;
            foreach (var request in images)
            {
                db.ProductImages.Add(new ProductImage
                {
                    CatalogItemId = product.Id,
                    Url = request.Url,
                    AltText = request.AltText ?? product.Name,
                    DisplayOrder = order,
                    IsPrimary = request.IsPrimary || order == 0
                });
                order++;
            }

            // Keep the legacy PictureUri field in sync for the original /api/catalog endpoints.
            product.PictureUri = images.FirstOrDefault(i => i.IsPrimary)?.Url ?? images.FirstOrDefault()?.Url ?? string.Empty;
        }

        private async Task ReplaceVariants(CatalogItem product, List<ProductVariantRequest> variants, CancellationToken ct)
        {
            var existing = await db.ProductVariants.Where(v => v.CatalogItemId == product.Id).ToListAsync(ct);
            var keptIds = variants.Where(v => v.Id is > 0).Select(v => v.Id!.Value).ToHashSet();

            db.ProductVariants.RemoveRange(existing.Where(v => !keptIds.Contains(v.Id)));

            var order = 0;
            foreach (var request in variants)
            {
                var variant = request.Id is > 0 ? existing.FirstOrDefault(v => v.Id == request.Id) : null;

                if (variant is null)
                {
                    variant = new ProductVariant { CatalogItemId = product.Id };
                    db.ProductVariants.Add(variant);
                }

                variant.Sku = string.IsNullOrWhiteSpace(request.Sku)
                    ? BuildVariantSku(product, request, order)
                    : request.Sku.Trim().ToUpperInvariant();
                variant.Color = request.Color;
                variant.ColorHex = request.ColorHex;
                variant.Size = request.Size;
                variant.PriceAdjustment = request.PriceAdjustment;
                variant.Stock = request.Stock;
                variant.IsActive = request.IsActive;
                variant.DisplayOrder = order;

                order++;
            }
        }

        private static string BuildVariantSku(CatalogItem product, ProductVariantRequest request, int index)
        {
            var prefix = product.Sku ?? Slug.From(product.Name).ToUpperInvariant();
            var parts = new[] { prefix, request.Color, request.Size }
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Select(p => Slug.From(p).ToUpperInvariant());

            return string.Join('-', parts) + $"-{index:D2}";
        }

        private Task SyncLegacyPicture(int productId, CancellationToken ct) =>
            db.CatalogItems
                .Where(p => p.Id == productId)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.PictureUri,
                    p => db.ProductImages
                        .Where(i => i.CatalogItemId == p.Id)
                        .OrderByDescending(i => i.IsPrimary).ThenBy(i => i.DisplayOrder)
                        .Select(i => i.Url)
                        .FirstOrDefault() ?? string.Empty), ct);

        private void PublishPriceChange(CatalogItem product, decimal oldPrice)
        {
            if (oldPrice == product.EffectivePrice) return;

            eventBus.Publish(new ProductPriceChangedIntegrationEvent(product.Id, product.EffectivePrice, oldPrice));
            logger.LogInformation("Product {ProductId} price changed {Old} -> {New}", product.Id, oldPrice, product.EffectivePrice);
        }

        private void PublishStockChange(CatalogItem product, int oldStock)
        {
            if (oldStock == product.TotalStock) return;

            eventBus.Publish(new ProductStockChangedIntegrationEvent(product.Id, product.TotalStock, oldStock));
        }

        private async Task<IReadOnlyCollection<CategoryBreadcrumbDto>> BuildBreadcrumbs(int? categoryId, CancellationToken ct)
        {
            if (categoryId is null) return Array.Empty<CategoryBreadcrumbDto>();

            var categories = await db.Categories.AsNoTracking()
                .Select(c => new { c.Id, c.Name, c.Slug, c.ParentId })
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
    }
}
