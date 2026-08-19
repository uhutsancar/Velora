import { createApi } from '@reduxjs/toolkit/query/react';
import { createAxiosBaseQuery } from '@velora/shared';
import { apiClient } from '@/lib/apiClient';

export const API_TAGS = [
  'Product',
  'ProductList',
  'Category',
  'Brand',
  'Coupon',
  'Campaign',
  'Review',
  'Order',
  'OrderList',
  'User',
  'Role',
  'Stats',
  'Dashboard',
] as const;

export type ApiTag = (typeof API_TAGS)[number];

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: createAxiosBaseQuery(apiClient),
  tagTypes: API_TAGS,
  // Back-office data changes while you look at it, so caches are short lived
  // and every mutation invalidates precisely what it touched.
  keepUnusedDataFor: 30,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
