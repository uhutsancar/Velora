import {
  cleanParams,
  endpoints,
  type AdminProductDetail,
  type AdminProductQuery,
  type Brand,
  type BrandRequest,
  type Campaign,
  type CampaignRequest,
  type CatalogStats,
  type Category,
  type CategoryRequest,
  type Coupon,
  type CouponRequest,
  type PagedResult,
  type ProductImage,
  type ProductListItem,
  type ProductRequest,
  type Review,
  type UploadedMedia,
} from '@velora/shared';
import { apiClient } from '@/lib/apiClient';
import { baseApi } from './baseApi';

const PRODUCT_LIST_TAG = { type: 'ProductList' as const, id: 'LIST' };
const STATS_TAG = { type: 'Stats' as const, id: 'CATALOG' };

export const catalogAdminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ---------- products ----------
    getAdminProducts: builder.query<PagedResult<ProductListItem>, AdminProductQuery>({
      query: (params) => ({ url: endpoints.admin.products.root, params: cleanParams({ ...params }) }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Product' as const, id })), PRODUCT_LIST_TAG]
          : [PRODUCT_LIST_TAG],
    }),

    getAdminProduct: builder.query<AdminProductDetail, number>({
      query: (id) => ({ url: endpoints.admin.products.byId(id) }),
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),

    createProduct: builder.mutation<AdminProductDetail, ProductRequest>({
      query: (body) => ({ url: endpoints.admin.products.root, method: 'POST', data: body }),
      invalidatesTags: [PRODUCT_LIST_TAG, STATS_TAG, { type: 'Dashboard', id: 'MAIN' }],
    }),

    updateProduct: builder.mutation<AdminProductDetail, { id: number; body: ProductRequest }>({
      query: ({ id, body }) => ({ url: endpoints.admin.products.byId(id), method: 'PUT', data: body }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Product', id: arg.id }, PRODUCT_LIST_TAG, STATS_TAG],
    }),

    deleteProduct: builder.mutation<void, number>({
      query: (id) => ({ url: endpoints.admin.products.byId(id), method: 'DELETE' }),
      invalidatesTags: [PRODUCT_LIST_TAG, STATS_TAG],
    }),

    setProductPublishState: builder.mutation<void, { id: number; isPublished: boolean }>({
      query: ({ id, isPublished }) => ({
        url: endpoints.admin.products.publish(id),
        method: 'PUT',
        data: { isPublished },
      }),
      // Optimistic patch on the detail cache; the list is refreshed by invalidation.
      onQueryStarted: async ({ id, isPublished }, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          catalogAdminApi.util.updateQueryData('getAdminProduct', id, (draft) => {
            draft.isPublished = isPublished;
          }),
        );

        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Product', id: arg.id },
        PRODUCT_LIST_TAG,
        STATS_TAG,
      ],
    }),

    updateProductStock: builder.mutation<
      void,
      { id: number; availableStock: number; variants: Array<{ id: number; stock: number }> }
    >({
      query: ({ id, availableStock, variants }) => ({
        url: endpoints.admin.products.stock(id),
        method: 'PUT',
        data: { availableStock, variants },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Product', id: arg.id }, PRODUCT_LIST_TAG, STATS_TAG],
    }),

    updateProductPricing: builder.mutation<
      void,
      { id: number; price: number; discountPrice: number | null }
    >({
      query: ({ id, price, discountPrice }) => ({
        url: endpoints.admin.products.pricing(id),
        method: 'PUT',
        data: { price, discountPrice },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Product', id: arg.id }, PRODUCT_LIST_TAG, STATS_TAG],
    }),

    addProductImage: builder.mutation<
      ProductImage,
      { id: number; url: string; altText?: string | null; displayOrder: number; isPrimary: boolean }
    >({
      query: ({ id, ...body }) => ({
        url: endpoints.admin.products.images(id),
        method: 'POST',
        data: body,
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Product', id: arg.id }],
    }),

    deleteProductImage: builder.mutation<void, { id: number; imageId: number }>({
      query: ({ id, imageId }) => ({ url: endpoints.admin.products.image(id, imageId), method: 'DELETE' }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Product', id: arg.id }],
    }),

    reorderProductImages: builder.mutation<void, { id: number; imageIds: number[] }>({
      query: ({ id, imageIds }) => ({
        url: endpoints.admin.products.imageOrder(id),
        method: 'PUT',
        data: { imageIds },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Product', id: arg.id }],
    }),

    setPrimaryProductImage: builder.mutation<void, { id: number; imageId: number }>({
      query: ({ id, imageId }) => ({
        url: endpoints.admin.products.primaryImage(id, imageId),
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Product', id: arg.id }],
    }),

    getCatalogStats: builder.query<CatalogStats, void>({
      query: () => ({ url: endpoints.admin.products.stats }),
      providesTags: [STATS_TAG],
    }),

    // ---------- taxonomy ----------
    getAdminCategories: builder.query<Category[], void>({
      query: () => ({ url: endpoints.admin.categories.root }),
      providesTags: [{ type: 'Category', id: 'LIST' }],
    }),

    createCategory: builder.mutation<Category, CategoryRequest>({
      query: (body) => ({ url: endpoints.admin.categories.root, method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),

    updateCategory: builder.mutation<Category, { id: number; body: CategoryRequest }>({
      query: ({ id, body }) => ({ url: endpoints.admin.categories.byId(id), method: 'PUT', data: body }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),

    deleteCategory: builder.mutation<void, number>({
      query: (id) => ({ url: endpoints.admin.categories.byId(id), method: 'DELETE' }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),

    getAdminBrands: builder.query<Brand[], void>({
      query: () => ({ url: endpoints.admin.brands.root }),
      providesTags: [{ type: 'Brand', id: 'LIST' }],
    }),

    createBrand: builder.mutation<Brand, BrandRequest>({
      query: (body) => ({ url: endpoints.admin.brands.root, method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Brand', id: 'LIST' }],
    }),

    updateBrand: builder.mutation<Brand, { id: number; body: BrandRequest }>({
      query: ({ id, body }) => ({ url: endpoints.admin.brands.byId(id), method: 'PUT', data: body }),
      invalidatesTags: [{ type: 'Brand', id: 'LIST' }],
    }),

    deleteBrand: builder.mutation<void, number>({
      query: (id) => ({ url: endpoints.admin.brands.byId(id), method: 'DELETE' }),
      invalidatesTags: [{ type: 'Brand', id: 'LIST' }],
    }),

    // ---------- promotions ----------
    getAdminCoupons: builder.query<
      PagedResult<Coupon>,
      { search?: string; isActive?: boolean; pageIndex?: number; pageSize?: number } | void
    >({
      query: (args) => ({
        url: endpoints.admin.coupons.root,
        params: cleanParams({ ...(args ?? {}) }),
      }),
      providesTags: [{ type: 'Coupon', id: 'LIST' }],
    }),

    createCoupon: builder.mutation<Coupon, CouponRequest>({
      query: (body) => ({ url: endpoints.admin.coupons.root, method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Coupon', id: 'LIST' }],
    }),

    updateCoupon: builder.mutation<Coupon, { id: number; body: CouponRequest }>({
      query: ({ id, body }) => ({ url: endpoints.admin.coupons.byId(id), method: 'PUT', data: body }),
      invalidatesTags: [{ type: 'Coupon', id: 'LIST' }],
    }),

    deleteCoupon: builder.mutation<void, number>({
      query: (id) => ({ url: endpoints.admin.coupons.byId(id), method: 'DELETE' }),
      invalidatesTags: [{ type: 'Coupon', id: 'LIST' }],
    }),

    getAdminCampaigns: builder.query<Campaign[], void>({
      query: () => ({ url: endpoints.admin.campaigns.root }),
      providesTags: [{ type: 'Campaign', id: 'LIST' }],
    }),

    createCampaign: builder.mutation<Campaign, CampaignRequest>({
      query: (body) => ({ url: endpoints.admin.campaigns.root, method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Campaign', id: 'LIST' }],
    }),

    updateCampaign: builder.mutation<Campaign, { id: number; body: CampaignRequest }>({
      query: ({ id, body }) => ({ url: endpoints.admin.campaigns.byId(id), method: 'PUT', data: body }),
      invalidatesTags: [{ type: 'Campaign', id: 'LIST' }],
    }),

    deleteCampaign: builder.mutation<void, number>({
      query: (id) => ({ url: endpoints.admin.campaigns.byId(id), method: 'DELETE' }),
      invalidatesTags: [{ type: 'Campaign', id: 'LIST' }],
    }),

    // ---------- reviews ----------
    getAdminReviews: builder.query<
      PagedResult<Review>,
      { approved?: boolean; pageIndex?: number; pageSize?: number } | void
    >({
      query: (args) => ({
        url: endpoints.admin.reviews.root,
        params: cleanParams({ ...(args ?? {}) }),
      }),
      providesTags: [{ type: 'Review', id: 'LIST' }],
    }),

    setReviewApproval: builder.mutation<void, { id: number; isApproved: boolean }>({
      query: ({ id, isApproved }) => ({
        url: endpoints.admin.reviews.approval(id),
        method: 'PUT',
        data: { isApproved },
      }),
      invalidatesTags: [{ type: 'Review', id: 'LIST' }, STATS_TAG],
    }),

    deleteReview: builder.mutation<void, number>({
      query: (id) => ({ url: endpoints.admin.reviews.byId(id), method: 'DELETE' }),
      invalidatesTags: [{ type: 'Review', id: 'LIST' }, STATS_TAG],
    }),
  }),
});

/**
 * Image upload is multipart, which does not fit the JSON base query, so it goes
 * straight through the shared axios client (still getting auth + retry + errors).
 */
export async function uploadMedia(files: File[]): Promise<UploadedMedia[]> {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));

  return apiClient.post<UploadedMedia[]>(endpoints.admin.media.root, form, {
    // Let the browser set the multipart boundary.
    headers: { 'Content-Type': undefined as unknown as string },
  });
}

export const {
  useGetAdminProductsQuery,
  useGetAdminProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useSetProductPublishStateMutation,
  useUpdateProductStockMutation,
  useUpdateProductPricingMutation,
  useAddProductImageMutation,
  useDeleteProductImageMutation,
  useReorderProductImagesMutation,
  useSetPrimaryProductImageMutation,
  useGetCatalogStatsQuery,
  useGetAdminCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetAdminBrandsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
  useGetAdminCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
  useGetAdminCampaignsQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useDeleteCampaignMutation,
  useGetAdminReviewsQuery,
  useSetReviewApprovalMutation,
  useDeleteReviewMutation,
} = catalogAdminApi;
