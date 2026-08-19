import {
  cleanParams,
  endpoints,
  type Address,
  type AddressRequest,
  type ChangePasswordRequest,
  type OrderDetail,
  type OrderStatusOption,
  type OrderSummary,
  type PagedResult,
  type UpdateProfileRequest,
  type UserProfile,
} from '@velora/shared';
import { baseApi } from './baseApi';

export const accountApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query<UserProfile, void>({
      query: () => ({ url: endpoints.auth.me }),
      providesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    updateProfile: builder.mutation<UserProfile, UpdateProfileRequest>({
      query: (body) => ({ url: endpoints.auth.me, method: 'PUT', data: body }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    changePassword: builder.mutation<void, ChangePasswordRequest>({
      query: (body) => ({ url: endpoints.auth.changePassword, method: 'POST', data: body }),
    }),

    getAddresses: builder.query<Address[], void>({
      query: () => ({ url: endpoints.addresses.root }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Address' as const, id })),
              { type: 'Address' as const, id: 'LIST' },
            ]
          : [{ type: 'Address' as const, id: 'LIST' }],
    }),

    createAddress: builder.mutation<Address, AddressRequest>({
      query: (body) => ({ url: endpoints.addresses.root, method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Address', id: 'LIST' }],
    }),

    updateAddress: builder.mutation<Address, { id: string; body: AddressRequest }>({
      query: ({ id, body }) => ({ url: endpoints.addresses.byId(id), method: 'PUT', data: body }),
      invalidatesTags: [{ type: 'Address', id: 'LIST' }],
    }),

    setDefaultAddress: builder.mutation<void, string>({
      query: (id) => ({ url: endpoints.addresses.setDefault(id), method: 'PUT' }),
      invalidatesTags: [{ type: 'Address', id: 'LIST' }],
    }),

    deleteAddress: builder.mutation<void, string>({
      query: (id) => ({ url: endpoints.addresses.byId(id), method: 'DELETE' }),
      invalidatesTags: [{ type: 'Address', id: 'LIST' }],
    }),

    getMyOrders: builder.query<
      PagedResult<OrderSummary>,
      { statusId?: number; pageIndex?: number; pageSize?: number } | void
    >({
      query: (args) => ({
        url: endpoints.orders.root,
        params: cleanParams({
          statusId: args?.statusId,
          pageIndex: args?.pageIndex ?? 0,
          pageSize: args?.pageSize ?? 10,
        }),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Order' as const, id })),
              { type: 'Order' as const, id: 'LIST' },
            ]
          : [{ type: 'Order' as const, id: 'LIST' }],
    }),

    getOrderById: builder.query<OrderDetail, string>({
      query: (id) => ({ url: endpoints.orders.byId(id) }),
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),

    getOrderStatuses: builder.query<OrderStatusOption[], void>({
      query: () => ({ url: endpoints.orders.statuses }),
      keepUnusedDataFor: 3600,
    }),

    cancelOrder: builder.mutation<void, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: endpoints.orders.cancel(id),
        method: 'POST',
        data: { reason },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Order', id: arg.id },
        { type: 'Order', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useGetAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useSetDefaultAddressMutation,
  useDeleteAddressMutation,
  useGetMyOrdersQuery,
  useGetOrderByIdQuery,
  useGetOrderStatusesQuery,
  useCancelOrderMutation,
} = accountApi;
