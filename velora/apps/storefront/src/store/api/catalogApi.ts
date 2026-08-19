import {
  cleanParams,
  endpoints,
  type Brand,
  type Campaign,
  type Category,
  type CouponValidationResult,
  type CreateReviewRequest,
  type PagedResult,
  type ProductDetail,
  type ProductFacets,
  type ProductListItem,
  type ProductQuery,
  type Review,
  type ReviewSummary,
} from '@velora/shared';
import { baseApi } from './baseApi';

/** Stable cache key for a product list, so identical filters share one cache entry. */
const listKey = (query: ProductQuery): string => JSON.stringify(cleanParams({ ...query }));

export const catalogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    searchProducts: builder.query<PagedResult<ProductListItem>, ProductQuery>({
      query: (params) => ({ url: endpoints.products.search, params: cleanParams({ ...params }) }),
      serializeQueryArgs: ({ endpointName, queryArgs }) => `${endpointName}(${listKey(queryArgs)})`,
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Product' as const, id })),
              { type: 'ProductList' as const, id: 'LIST' },
            ]
          : [{ type: 'ProductList' as const, id: 'LIST' }],
    }),

    /**
     * Same query as `searchProducts` but appends pages instead of replacing them,
     * which is what the "load more" button on the listing page needs.
     */
    searchProductsInfinite: builder.query<PagedResult<ProductListItem>, ProductQuery>({
      query: (params) => ({ url: endpoints.products.search, params: cleanParams({ ...params }) }),
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const { pageIndex: _pageIndex, ...rest } = queryArgs;
        return `${endpointName}(${listKey(rest)})`;
      },
      merge: (currentCache, newItems) => {
        if (newItems.pageIndex === 0) return newItems;

        return {
          ...newItems,
          items: [...currentCache.items, ...newItems.items],
        };
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.pageIndex !== previousArg?.pageIndex,
      providesTags: [{ type: 'ProductList', id: 'INFINITE' }],
    }),

    getProductFacets: builder.query<ProductFacets, ProductQuery>({
      query: (params) => ({ url: endpoints.products.facets, params: cleanParams({ ...params }) }),
      providesTags: [{ type: 'ProductList', id: 'FACETS' }],
    }),

    getProductBySlug: builder.query<ProductDetail, string>({
      query: (slug) => ({ url: endpoints.products.bySlug(slug) }),
      providesTags: (result) => (result ? [{ type: 'Product', id: result.id }] : []),
    }),

    getRelatedProducts: builder.query<ProductListItem[], { slug: string; take?: number }>({
      query: ({ slug, take = 8 }) => ({ url: endpoints.products.related(slug), params: { take } }),
    }),

    getFeaturedProducts: builder.query<ProductListItem[], number | void>({
      query: (take) => ({ url: endpoints.products.featured, params: { take: take ?? 8 } }),
      providesTags: [{ type: 'ProductList', id: 'FEATURED' }],
    }),

    getNewArrivals: builder.query<ProductListItem[], number | void>({
      query: (take) => ({ url: endpoints.products.newArrivals, params: { take: take ?? 8 } }),
      providesTags: [{ type: 'ProductList', id: 'NEW' }],
    }),

    getBestSellers: builder.query<ProductListItem[], number | void>({
      query: (take) => ({ url: endpoints.products.bestSellers, params: { take: take ?? 8 } }),
      providesTags: [{ type: 'ProductList', id: 'BEST' }],
    }),

    getProductsByIds: builder.query<ProductListItem[], number[]>({
      query: (ids) => ({ url: endpoints.products.batch, params: { ids: ids.join(',') } }),
      providesTags: [{ type: 'ProductList', id: 'BATCH' }],
    }),

    getCategoryTree: builder.query<Category[], void>({
      query: () => ({ url: endpoints.categories.tree }),
      // The navigation tree barely changes; hold it for the whole session.
      keepUnusedDataFor: 3600,
      providesTags: [{ type: 'Category', id: 'TREE' }],
    }),

    getFeaturedCategories: builder.query<Category[], void>({
      query: () => ({ url: endpoints.categories.featured }),
      keepUnusedDataFor: 3600,
      providesTags: [{ type: 'Category', id: 'FEATURED' }],
    }),

    getCategoryBySlug: builder.query<Category, string>({
      query: (slug) => ({ url: endpoints.categories.bySlug(slug) }),
      providesTags: (result) => (result ? [{ type: 'Category', id: result.id }] : []),
    }),

    getBrands: builder.query<Brand[], { featuredOnly?: boolean } | void>({
      query: (args) => ({
        url: endpoints.brands.root,
        params: cleanParams({ featuredOnly: args?.featuredOnly }),
      }),
      keepUnusedDataFor: 1800,
      providesTags: [{ type: 'Brand', id: 'LIST' }],
    }),

    getCampaigns: builder.query<Campaign[], { placement?: string } | void>({
      query: (args) => ({
        url: endpoints.campaigns.root,
        params: cleanParams({ placement: args?.placement }),
      }),
      keepUnusedDataFor: 600,
      providesTags: [{ type: 'Campaign', id: 'LIST' }],
    }),

    getCampaignBySlug: builder.query<Campaign, string>({
      query: (slug) => ({ url: endpoints.campaigns.bySlug(slug) }),
    }),

    getReviews: builder.query<
      PagedResult<Review>,
      { productId: number; pageIndex?: number; pageSize?: number }
    >({
      query: ({ productId, pageIndex = 0, pageSize = 10 }) => ({
        url: endpoints.products.reviews(productId),
        params: { pageIndex, pageSize },
      }),
      providesTags: (_result, _error, arg) => [{ type: 'Review', id: arg.productId }],
    }),

    getReviewSummary: builder.query<ReviewSummary, number>({
      query: (productId) => ({ url: endpoints.products.reviewSummary(productId) }),
      providesTags: (_result, _error, productId) => [{ type: 'Review', id: `SUMMARY-${productId}` }],
    }),

    createReview: builder.mutation<Review, { productId: number; body: CreateReviewRequest }>({
      query: ({ productId, body }) => ({
        url: endpoints.products.reviews(productId),
        method: 'POST',
        data: body,
      }),
      // The rating is denormalised onto the product, so refresh it too.
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Review', id: arg.productId },
        { type: 'Review', id: `SUMMARY-${arg.productId}` },
        { type: 'Product', id: arg.productId },
      ],
    }),

    validateCoupon: builder.mutation<CouponValidationResult, { code: string; subtotal: number }>({
      query: (body) => ({ url: endpoints.coupons.validate, method: 'POST', data: body }),
    }),
  }),
});

export const {
  useSearchProductsQuery,
  useSearchProductsInfiniteQuery,
  useGetProductFacetsQuery,
  useGetProductBySlugQuery,
  useGetRelatedProductsQuery,
  useGetFeaturedProductsQuery,
  useGetNewArrivalsQuery,
  useGetBestSellersQuery,
  useGetProductsByIdsQuery,
  useGetCategoryTreeQuery,
  useGetFeaturedCategoriesQuery,
  useGetCategoryBySlugQuery,
  useGetBrandsQuery,
  useGetCampaignsQuery,
  useGetCampaignBySlugQuery,
  useGetReviewsQuery,
  useGetReviewSummaryQuery,
  useCreateReviewMutation,
  useValidateCouponMutation,
} = catalogApi;
