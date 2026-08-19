import {
  cleanParams,
  endpoints,
  type AdminUserListItem,
  type DashboardData,
  type OrderDetail,
  type OrderStatusOption,
  type OrderSummary,
  type PagedResult,
  type Permission,
  type Role,
  type UserProfile,
  type UserStats,
} from '@velora/shared';
import { baseApi } from './baseApi';

const ORDER_LIST_TAG = { type: 'OrderList' as const, id: 'LIST' };
const USER_LIST_TAG = { type: 'User' as const, id: 'LIST' };
const DASHBOARD_TAG = { type: 'Dashboard' as const, id: 'MAIN' };

export interface AdminOrderQuery {
  search?: string;
  statusId?: number;
  fromUtc?: string;
  toUtc?: string;
  pageIndex?: number;
  pageSize?: number;
}

export const operationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ---------- orders ----------
    getAdminOrders: builder.query<PagedResult<OrderSummary>, AdminOrderQuery>({
      query: (params) => ({ url: endpoints.admin.orders.root, params: cleanParams({ ...params }) }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Order' as const, id })), ORDER_LIST_TAG]
          : [ORDER_LIST_TAG],
    }),

    getAdminOrder: builder.query<OrderDetail, string>({
      query: (id) => ({ url: endpoints.admin.orders.byId(id) }),
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),

    getOrderStatuses: builder.query<OrderStatusOption[], void>({
      query: () => ({ url: endpoints.orders.statuses }),
      keepUnusedDataFor: 3600,
    }),

    updateOrderStatus: builder.mutation<void, { id: string; statusId: number; reason?: string }>({
      query: ({ id, statusId, reason }) => ({
        url: endpoints.admin.orders.status(id),
        method: 'PUT',
        data: { statusId, reason },
      }),
      // A status change moves revenue between buckets, so the dashboard is stale too.
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Order', id: arg.id },
        ORDER_LIST_TAG,
        DASHBOARD_TAG,
      ],
    }),

    // ---------- analytics ----------
    getDashboard: builder.query<
      DashboardData,
      { days?: number; topProducts?: number; recentOrders?: number } | void
    >({
      query: (args) => ({
        url: endpoints.admin.analytics.dashboard,
        params: cleanParams({
          days: args?.days ?? 30,
          topProducts: args?.topProducts ?? 8,
          recentOrders: args?.recentOrders ?? 8,
        }),
      }),
      providesTags: [DASHBOARD_TAG],
    }),

    // ---------- users ----------
    getAdminUsers: builder.query<
      PagedResult<AdminUserListItem>,
      { search?: string; role?: string; isActive?: boolean; pageIndex?: number; pageSize?: number }
    >({
      query: (params) => ({ url: endpoints.admin.users.root, params: cleanParams({ ...params }) }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'User' as const, id })), USER_LIST_TAG]
          : [USER_LIST_TAG],
    }),

    getUserStats: builder.query<UserStats, void>({
      query: () => ({ url: endpoints.admin.users.stats }),
      providesTags: [{ type: 'User', id: 'STATS' }],
    }),

    getAdminUser: builder.query<UserProfile, string>({
      query: (id) => ({ url: endpoints.admin.users.byId(id) }),
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),

    setUserStatus: builder.mutation<void, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: endpoints.admin.users.status(id),
        method: 'PUT',
        data: { isActive },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'User', id: arg.id },
        USER_LIST_TAG,
        { type: 'User', id: 'STATS' },
      ],
    }),

    setUserRoles: builder.mutation<UserProfile, { id: string; roles: string[] }>({
      query: ({ id, roles }) => ({ url: endpoints.admin.users.roles(id), method: 'PUT', data: { roles } }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'User', id: arg.id }, USER_LIST_TAG],
    }),

    resetUserPassword: builder.mutation<void, { id: string; newPassword: string }>({
      query: ({ id, newPassword }) => ({
        url: endpoints.admin.users.resetPassword(id),
        method: 'POST',
        data: { newPassword },
      }),
    }),

    deleteUser: builder.mutation<void, string>({
      query: (id) => ({ url: endpoints.admin.users.byId(id), method: 'DELETE' }),
      invalidatesTags: [USER_LIST_TAG, { type: 'User', id: 'STATS' }],
    }),

    getRoles: builder.query<Role[], void>({
      query: () => ({ url: endpoints.admin.roles.root }),
      keepUnusedDataFor: 1800,
      providesTags: [{ type: 'Role', id: 'LIST' }],
    }),

    getPermissions: builder.query<Permission[], void>({
      query: () => ({ url: endpoints.admin.roles.permissions }),
      keepUnusedDataFor: 3600,
    }),
  }),
});

export const {
  useGetAdminOrdersQuery,
  useGetAdminOrderQuery,
  useGetOrderStatusesQuery,
  useUpdateOrderStatusMutation,
  useGetDashboardQuery,
  useGetAdminUsersQuery,
  useGetUserStatsQuery,
  useGetAdminUserQuery,
  useSetUserStatusMutation,
  useSetUserRolesMutation,
  useResetUserPasswordMutation,
  useDeleteUserMutation,
  useGetRolesQuery,
  useGetPermissionsQuery,
} = operationsApi;
