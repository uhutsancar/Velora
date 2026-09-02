/**
 * Catalogue contracts. These mirror the DTOs returned by CatalogService
 * (`Core/Application/Dtos`); keep both sides in step when either changes.
 */

export interface ProductSwatch {
  color: string | null;
  colorHex: string | null;
}

export interface ProductListItem {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  price: number;
  discountPrice: number | null;
  effectivePrice: number;
  discountPercentage: number;
  primaryImageUrl: string | null;
  hoverImageUrl: string | null;
  brandName: string | null;
  brandSlug: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  ratingAverage: number;
  ratingCount: number;
  totalStock: number;
  inStock: boolean;
  isFeatured: boolean;
  isNew: boolean;
  tags: string[];
  swatches: ProductSwatch[];
}

export interface ProductImage {
  id: number;
  url: string;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
}

export interface ProductVariant {
  id: number;
  sku: string;
  color: string | null;
  colorHex: string | null;
  size: string | null;
  priceAdjustment: number;
  price: number;
  stock: number;
  isActive: boolean;
  displayOrder: number;
}

export interface CategoryBreadcrumb {
  id: number;
  name: string;
  slug: string;
}

export interface ProductDetail extends ProductListItem {
  description: string;
  sku: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  isPublished: boolean;
  soldCount: number;
  createdAtUtc: string;
  categoryId: number | null;
  catalogBrandId: number;
  catalogTypeId: number;
  images: ProductImage[];
  variants: ProductVariant[];
  breadcrumbs: CategoryBreadcrumb[];
}

/** Adds cost/margin fields that only the back office may see. */
export interface AdminProductDetail extends ProductDetail {
  costPrice: number | null;
  availableStock: number;
  restockThreshold: number;
  barcode: string | null;
  updatedAtUtc: string | null;
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export interface ProductFacets {
  minPrice: number;
  maxPrice: number;
  brands: FacetValue[];
  categories: FacetValue[];
  colors: FacetValue[];
  sizes: FacetValue[];
}

export const PRODUCT_SORT = {
  Newest: 0,
  PriceAsc: 1,
  PriceDesc: 2,
  Rating: 3,
  BestSelling: 4,
  NameAsc: 5,
} as const;

export type ProductSort = (typeof PRODUCT_SORT)[keyof typeof PRODUCT_SORT];

export interface ProductQuery {
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  size?: string;
  tag?: string;
  inStock?: boolean;
  onSale?: boolean;
  featured?: boolean;
  minRating?: number;
  sort?: ProductSort;
  pageIndex?: number;
  pageSize?: number;
}

export interface AdminProductQuery extends ProductQuery {
  published?: boolean;
  lowStock?: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  productCount: number;
  children: Category[];
}

export interface CategoryRequest {
  name: string;
  slug?: string | null;
  description?: string | null;
  parentId?: number | null;
  imageUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface Brand {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  productCount: number;
}

export interface BrandRequest {
  name: string;
  slug?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
}

export interface Review {
  id: number;
  productId: number;
  productName: string | null;
  userName: string;
  rating: number;
  title: string | null;
  comment: string;
  isApproved: boolean;
  createdAtUtc: string;
}

export interface ReviewSummary {
  average: number;
  total: number;
  /** Star value (1-5) mapped to the number of reviews. */
  distribution: Record<string, number>;
}

export interface CreateReviewRequest {
  rating: number;
  title?: string | null;
  comment: string;
}

export const DISCOUNT_TYPE = {
  Percentage: 0,
  FixedAmount: 1,
  FreeShipping: 2,
} as const;

export type DiscountType = (typeof DISCOUNT_TYPE)[keyof typeof DISCOUNT_TYPE];

export interface Coupon {
  id: number;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderAmount: number;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number;
  startsAtUtc: string;
  endsAtUtc: string;
  isActive: boolean;
}

export interface CouponRequest {
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderAmount: number;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  perUserLimit: number;
  startsAtUtc: string;
  endsAtUtc: string;
  isActive: boolean;
}

export interface CouponValidationResult {
  isValid: boolean;
  code: string | null;
  message: string | null;
  discountAmount: number;
  discountType: DiscountType | null;
  discountValue: number | null;
}

export const CAMPAIGN_PLACEMENT = {
  Home: 0,
  Hero: 1,
  Banner: 2,
  Collection: 3,
} as const;

export type CampaignPlacement = (typeof CAMPAIGN_PLACEMENT)[keyof typeof CAMPAIGN_PLACEMENT];

export interface Campaign {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  discountPercentage: number;
  categoryId: number | null;
  categorySlug: string | null;
  placement: CampaignPlacement;
  startsAtUtc: string;
  endsAtUtc: string;
  isActive: boolean;
  displayOrder: number;
}

export interface CampaignRequest {
  name: string;
  slug?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  discountPercentage: number;
  categoryId?: number | null;
  placement: CampaignPlacement;
  startsAtUtc: string;
  endsAtUtc: string;
  isActive: boolean;
  displayOrder: number;
}

export interface CategoryProductCount {
  category: string;
  count: number;
}

export interface CatalogStats {
  totalProducts: number;
  publishedProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  totalCategories: number;
  totalBrands: number;
  activeCoupons: number;
  pendingReviews: number;
  inventoryValue: number;
  potentialMargin: number;
  lowStockItems: ProductListItem[];
  productsByCategory: CategoryProductCount[];
}

export interface ProductImageRequest {
  url: string;
  altText?: string | null;
  displayOrder: number;
  isPrimary: boolean;
}

export interface ProductVariantRequest {
  id?: number | null;
  sku?: string | null;
  color?: string | null;
  colorHex?: string | null;
  size?: string | null;
  priceAdjustment: number;
  stock: number;
  isActive: boolean;
  displayOrder: number;
}

export interface ProductRequest {
  name: string;
  slug?: string | null;
  description: string;
  shortDescription?: string | null;
  price: number;
  discountPrice?: number | null;
  costPrice?: number | null;
  sku?: string | null;
  barcode?: string | null;
  categoryId?: number | null;
  catalogBrandId: number;
  catalogTypeId: number;
  availableStock: number;
  restockThreshold: number;
  isPublished: boolean;
  isFeatured: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  tags: string[];
  images: ProductImageRequest[];
  variants: ProductVariantRequest[];
}

export interface UploadedMedia {
  url: string;
  fileName: string;
  size: number;
}
