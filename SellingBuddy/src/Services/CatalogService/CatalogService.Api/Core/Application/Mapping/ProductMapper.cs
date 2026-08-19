using CatalogService.Api.Core.Application.Dtos;
using CatalogService.Api.Core.Domain;

namespace CatalogService.Api.Core.Application.Mapping
{
    /// <summary>
    /// Hand written projections. Explicit mapping keeps cost/margin fields out of the
    /// storefront payload by construction rather than by convention.
    /// </summary>
    public static class ProductMapper
    {
        /// <summary>A product created within this window is badged as "new" in the storefront.</summary>
        public static readonly TimeSpan NewProductWindow = TimeSpan.FromDays(30);

        public static ProductListItemDto ToListItem(CatalogItem item)
        {
            var ordered = item.Images.OrderByDescending(i => i.IsPrimary).ThenBy(i => i.DisplayOrder).ToList();

            return new ProductListItemDto
            {
                Id = item.Id,
                Name = item.Name,
                Slug = item.Slug,
                ShortDescription = item.ShortDescription,
                Price = item.Price,
                DiscountPrice = item.DiscountPrice,
                EffectivePrice = item.EffectivePrice,
                DiscountPercentage = item.DiscountPercentage,
                PrimaryImageUrl = ordered.FirstOrDefault()?.Url ?? item.PictureUri,
                HoverImageUrl = ordered.Skip(1).FirstOrDefault()?.Url,
                BrandName = item.CatalogBrand?.Brand,
                BrandSlug = item.CatalogBrand?.Slug,
                CategoryName = item.Category?.Name,
                CategorySlug = item.Category?.Slug,
                RatingAverage = item.RatingAverage,
                RatingCount = item.RatingCount,
                TotalStock = item.TotalStock,
                InStock = item.TotalStock > 0,
                IsFeatured = item.IsFeatured,
                IsNew = DateTime.UtcNow - item.CreatedAtUtc <= NewProductWindow,
                Tags = SplitTags(item.Tags),
                Swatches = item.Variants
                    .Where(v => v.IsActive && v.Color != null)
                    .GroupBy(v => v.Color)
                    .Select(g => new ProductSwatchDto { Color = g.Key, ColorHex = g.First().ColorHex })
                    .ToList()
            };
        }

        public static ProductDetailDto ToDetail(CatalogItem item, IReadOnlyCollection<CategoryBreadcrumbDto> breadcrumbs)
        {
            var detail = Copy<ProductDetailDto>(ToListItem(item));

            detail.Description = item.Description;
            detail.Sku = item.Sku;
            detail.MetaTitle = item.MetaTitle;
            detail.MetaDescription = item.MetaDescription;
            detail.IsPublished = item.IsPublished;
            detail.SoldCount = item.SoldCount;
            detail.CreatedAtUtc = item.CreatedAtUtc;
            detail.CategoryId = item.CategoryId;
            detail.CatalogBrandId = item.CatalogBrandId;
            detail.CatalogTypeId = item.CatalogTypeId;
            detail.Images = item.Images
                .OrderByDescending(i => i.IsPrimary).ThenBy(i => i.DisplayOrder)
                .Select(ToImageDto).ToList();
            detail.Variants = item.Variants
                .OrderBy(v => v.DisplayOrder).ThenBy(v => v.Id)
                .Select(v => ToVariantDto(v, item.EffectivePrice)).ToList();
            detail.Breadcrumbs = breadcrumbs;

            return detail;
        }

        public static AdminProductDetailDto ToAdminDetail(CatalogItem item, IReadOnlyCollection<CategoryBreadcrumbDto> breadcrumbs)
        {
            var detail = Copy<AdminProductDetailDto>(ToDetail(item, breadcrumbs));

            detail.CostPrice = item.CostPrice;
            detail.AvailableStock = item.AvailableStock;
            detail.RestockThreshold = item.RestockThreshold;
            detail.Barcode = item.Barcode;
            detail.UpdatedAtUtc = item.UpdatedAtUtc;

            return detail;
        }

        public static ProductImageDto ToImageDto(ProductImage image) => new()
        {
            Id = image.Id,
            Url = image.Url,
            AltText = image.AltText,
            DisplayOrder = image.DisplayOrder,
            IsPrimary = image.IsPrimary
        };

        public static ProductVariantDto ToVariantDto(ProductVariant variant, decimal basePrice) => new()
        {
            Id = variant.Id,
            Sku = variant.Sku,
            Color = variant.Color,
            ColorHex = variant.ColorHex,
            Size = variant.Size,
            PriceAdjustment = variant.PriceAdjustment,
            Price = Math.Max(0, basePrice + variant.PriceAdjustment),
            Stock = variant.Stock,
            IsActive = variant.IsActive,
            DisplayOrder = variant.DisplayOrder
        };

        public static CategoryDto ToCategoryDto(Category category, int productCount = 0) => new()
        {
            Id = category.Id,
            Name = category.Name,
            Slug = category.Slug,
            Description = category.Description,
            ParentId = category.ParentId,
            ImageUrl = category.ImageUrl,
            DisplayOrder = category.DisplayOrder,
            IsActive = category.IsActive,
            IsFeatured = category.IsFeatured,
            MetaTitle = category.MetaTitle,
            MetaDescription = category.MetaDescription,
            ProductCount = productCount
        };

        public static BrandDto ToBrandDto(CatalogBrand brand, int productCount = 0) => new()
        {
            Id = brand.Id,
            Name = brand.Brand,
            Slug = brand.Slug,
            Description = brand.Description,
            LogoUrl = brand.LogoUrl,
            IsActive = brand.IsActive,
            IsFeatured = brand.IsFeatured,
            DisplayOrder = brand.DisplayOrder,
            ProductCount = productCount
        };

        public static ReviewDto ToReviewDto(ProductReview review) => new()
        {
            Id = review.Id,
            ProductId = review.CatalogItemId,
            ProductName = review.CatalogItem?.Name,
            UserName = review.UserName,
            Rating = review.Rating,
            Title = review.Title,
            Comment = review.Comment,
            IsApproved = review.IsApproved,
            CreatedAtUtc = review.CreatedAtUtc
        };

        public static CouponDto ToCouponDto(Coupon coupon) => new()
        {
            Id = coupon.Id,
            Code = coupon.Code,
            Description = coupon.Description,
            DiscountType = coupon.DiscountType,
            DiscountValue = coupon.DiscountValue,
            MinimumOrderAmount = coupon.MinimumOrderAmount,
            MaxDiscountAmount = coupon.MaxDiscountAmount,
            UsageLimit = coupon.UsageLimit,
            UsedCount = coupon.UsedCount,
            PerUserLimit = coupon.PerUserLimit,
            StartsAtUtc = coupon.StartsAtUtc,
            EndsAtUtc = coupon.EndsAtUtc,
            IsActive = coupon.IsActive
        };

        public static CampaignDto ToCampaignDto(Campaign campaign) => new()
        {
            Id = campaign.Id,
            Name = campaign.Name,
            Slug = campaign.Slug,
            Description = campaign.Description,
            ImageUrl = campaign.ImageUrl,
            BannerUrl = campaign.BannerUrl,
            CtaLabel = campaign.CtaLabel,
            CtaUrl = campaign.CtaUrl,
            DiscountPercentage = campaign.DiscountPercentage,
            CategoryId = campaign.CategoryId,
            CategorySlug = campaign.Category?.Slug,
            Placement = campaign.Placement,
            StartsAtUtc = campaign.StartsAtUtc,
            EndsAtUtc = campaign.EndsAtUtc,
            IsActive = campaign.IsActive,
            DisplayOrder = campaign.DisplayOrder
        };

        public static IReadOnlyCollection<string> SplitTags(string? tags) =>
            string.IsNullOrWhiteSpace(tags)
                ? Array.Empty<string>()
                : tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        public static string? JoinTags(IEnumerable<string>? tags)
        {
            if (tags is null) return null;

            var cleaned = tags.Select(t => t.Trim().ToLowerInvariant())
                .Where(t => t.Length > 0)
                .Distinct()
                .ToArray();

            return cleaned.Length == 0 ? null : string.Join(',', cleaned);
        }

        /// <summary>Copies the base-class properties onto a derived DTO instance.</summary>
        private static TTarget Copy<TTarget>(ProductListItemDto source) where TTarget : ProductListItemDto, new()
        {
            var target = new TTarget
            {
                Id = source.Id,
                Name = source.Name,
                Slug = source.Slug,
                ShortDescription = source.ShortDescription,
                Price = source.Price,
                DiscountPrice = source.DiscountPrice,
                EffectivePrice = source.EffectivePrice,
                DiscountPercentage = source.DiscountPercentage,
                PrimaryImageUrl = source.PrimaryImageUrl,
                HoverImageUrl = source.HoverImageUrl,
                BrandName = source.BrandName,
                BrandSlug = source.BrandSlug,
                CategoryName = source.CategoryName,
                CategorySlug = source.CategorySlug,
                RatingAverage = source.RatingAverage,
                RatingCount = source.RatingCount,
                TotalStock = source.TotalStock,
                InStock = source.InStock,
                IsFeatured = source.IsFeatured,
                IsNew = source.IsNew,
                Tags = source.Tags,
                Swatches = source.Swatches
            };

            if (source is ProductDetailDto detail && target is ProductDetailDto targetDetail)
            {
                targetDetail.Description = detail.Description;
                targetDetail.Sku = detail.Sku;
                targetDetail.MetaTitle = detail.MetaTitle;
                targetDetail.MetaDescription = detail.MetaDescription;
                targetDetail.IsPublished = detail.IsPublished;
                targetDetail.SoldCount = detail.SoldCount;
                targetDetail.CreatedAtUtc = detail.CreatedAtUtc;
                targetDetail.CategoryId = detail.CategoryId;
                targetDetail.CatalogBrandId = detail.CatalogBrandId;
                targetDetail.CatalogTypeId = detail.CatalogTypeId;
                targetDetail.Images = detail.Images;
                targetDetail.Variants = detail.Variants;
                targetDetail.Breadcrumbs = detail.Breadcrumbs;
            }

            return target;
        }
    }
}
