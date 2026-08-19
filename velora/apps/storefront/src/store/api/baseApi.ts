import { createApi } from '@reduxjs/toolkit/query/react';
import { createAxiosBaseQuery } from '@velora/shared';
import { apiClient } from '@/lib/apiClient';

/**
 * Cache tags. Keeping them in one union means a typo becomes a compile error
 * rather than a silently stale list.
 */
export const API_TAGS = [
  'Product',
  'ProductList',
  'Category',
  'Brand',
  'Campaign',
  'Review',
  'Basket',
  'Wishlist',
  'Order',
  'Address',
  'Profile',
] as const;

export type ApiTag = (typeof API_TAGS)[number];

/**
 * Single RTK Query slice, extended by domain in `catalogApi`, `basketApi`, etc.
 * One slice keeps a single cache and a single middleware registration while the
 * endpoint definitions stay split by domain.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: createAxiosBaseQuery(apiClient),
  tagTypes: API_TAGS,
  // Catalogue data is not volatile; 60s avoids a refetch storm while browsing.
  keepUnusedDataFor: 60,
  refetchOnMountOrArgChange: false,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
