using CatalogService.Api.Core.Application.Dtos;
using Velora.Shared.Contracts;

namespace CatalogService.Api.Core.Application.Services
{
    /// <summary>Read side of the product aggregate, used by the storefront.</summary>
    public interface IProductQueryService
    {
        Task<PagedResult<ProductListItemDto>> Search(ProductQuery query, CancellationToken ct = default);

        Task<ProductDetailDto?> GetBySlug(string slug, CancellationToken ct = default);

        Task<IReadOnlyCollection<ProductListItemDto>> GetRelated(string slug, int take = 8, CancellationToken ct = default);

        Task<IReadOnlyCollection<ProductListItemDto>> GetFeatured(int take = 8, CancellationToken ct = default);

        Task<IReadOnlyCollection<ProductListItemDto>> GetNewArrivals(int take = 8, CancellationToken ct = default);

        Task<IReadOnlyCollection<ProductListItemDto>> GetBestSellers(int take = 8, CancellationToken ct = default);

        Task<IReadOnlyCollection<ProductListItemDto>> GetByIds(IReadOnlyCollection<int> ids, CancellationToken ct = default);

        Task<ProductFacetsDto> GetFacets(ProductQuery query, CancellationToken ct = default);

        Task IncrementViewCount(int productId, CancellationToken ct = default);
    }

    /// <summary>Write side, reachable only through the admin endpoints.</summary>
    public interface IProductAdminService
    {
        Task<PagedResult<ProductListItemDto>> Search(AdminProductQuery query, CancellationToken ct = default);

        Task<AdminProductDetailDto?> GetById(int id, CancellationToken ct = default);

        Task<AdminProductDetailDto> Create(CreateProductRequest request, CancellationToken ct = default);

        Task<AdminProductDetailDto> Update(int id, UpdateProductRequest request, CancellationToken ct = default);

        Task Delete(int id, CancellationToken ct = default);

        Task SetPublishState(int id, bool isPublished, CancellationToken ct = default);

        Task UpdateStock(int id, UpdateStockRequest request, CancellationToken ct = default);

        Task UpdatePricing(int id, UpdatePricingRequest request, CancellationToken ct = default);

        Task<ProductImageDto> AddImage(int id, ProductImageRequest request, CancellationToken ct = default);

        Task DeleteImage(int id, int imageId, CancellationToken ct = default);

        Task ReorderImages(int id, IReadOnlyList<int> imageIds, CancellationToken ct = default);

        Task SetPrimaryImage(int id, int imageId, CancellationToken ct = default);

        Task<CatalogStatsDto> GetStats(CancellationToken ct = default);
    }
}
