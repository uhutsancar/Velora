import {
  endpoints,
  type AddBasketItemRequest,
  type BasketCheckoutRequest,
  type CustomerBasket,
  type CustomerWishlist,
} from '@velora/shared';
import { baseApi } from './baseApi';

const BASKET_TAG = { type: 'Basket' as const, id: 'ME' };
const WISHLIST_TAG = { type: 'Wishlist' as const, id: 'ME' };

export const basketApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBasket: builder.query<CustomerBasket, void>({
      query: () => ({ url: endpoints.basket.me }),
      providesTags: [BASKET_TAG],
    }),

    addBasketItem: builder.mutation<CustomerBasket, AddBasketItemRequest>({
      query: (body) => ({ url: endpoints.basket.addItem, method: 'POST', data: body }),
      // The server merges duplicate lines and clamps quantities, so we take its
      // response as the new cache value rather than guessing optimistically.
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          void dispatch(basketApi.util.upsertQueryData('getBasket', undefined, data));
        } catch {
          // The error surfaces through the mutation result; nothing to patch back.
        }
      },
    }),

    updateBasketItemQuantity: builder.mutation<CustomerBasket, { lineId: string; quantity: number }>({
      query: ({ lineId, quantity }) => ({
        url: endpoints.basket.item(lineId),
        method: 'PUT',
        data: { quantity },
      }),
      onQueryStarted: async ({ lineId, quantity }, { dispatch, queryFulfilled }) => {
        // Optimistic: quantity steppers must feel instant.
        const patch = dispatch(
          basketApi.util.updateQueryData('getBasket', undefined, (draft) => {
            const line = draft.items.find((item) => item.id === lineId);
            if (!line) return;

            if (quantity <= 0) {
              draft.items = draft.items.filter((item) => item.id !== lineId);
            } else {
              line.quantity = quantity;
              line.lineTotal = line.unitPrice * quantity;
            }

            draft.subtotal = draft.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
            draft.totalQuantity = draft.items.reduce((sum, item) => sum + item.quantity, 0);
            draft.total = Math.max(0, draft.subtotal - draft.discountAmount);
          }),
        );

        try {
          const { data } = await queryFulfilled;
          void dispatch(basketApi.util.upsertQueryData('getBasket', undefined, data));
        } catch {
          patch.undo();
        }
      },
    }),

    removeBasketItem: builder.mutation<CustomerBasket, string>({
      query: (lineId) => ({ url: endpoints.basket.item(lineId), method: 'DELETE' }),
      onQueryStarted: async (lineId, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          basketApi.util.updateQueryData('getBasket', undefined, (draft) => {
            draft.items = draft.items.filter((item) => item.id !== lineId);
            draft.subtotal = draft.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
            draft.totalQuantity = draft.items.reduce((sum, item) => sum + item.quantity, 0);
            draft.total = Math.max(0, draft.subtotal - draft.discountAmount);
          }),
        );

        try {
          const { data } = await queryFulfilled;
          void dispatch(basketApi.util.upsertQueryData('getBasket', undefined, data));
        } catch {
          patch.undo();
        }
      },
    }),

    clearBasket: builder.mutation<void, void>({
      query: () => ({ url: endpoints.basket.clear, method: 'POST' }),
      invalidatesTags: [BASKET_TAG],
    }),

    applyBasketCoupon: builder.mutation<CustomerBasket, { code: string; discountAmount: number }>({
      query: (body) => ({ url: endpoints.basket.coupon, method: 'POST', data: body }),
      invalidatesTags: [BASKET_TAG],
    }),

    removeBasketCoupon: builder.mutation<CustomerBasket, void>({
      query: () => ({ url: endpoints.basket.coupon, method: 'DELETE' }),
      invalidatesTags: [BASKET_TAG],
    }),

    checkout: builder.mutation<void, BasketCheckoutRequest>({
      query: (body) => ({ url: endpoints.basket.checkout, method: 'POST', data: body }),
      // Checkout is asynchronous (event driven): the basket is cleared by the
      // OrderCreated handler, and the order list gains a row shortly after.
      invalidatesTags: [BASKET_TAG, { type: 'Order', id: 'LIST' }],
    }),

    getWishlist: builder.query<CustomerWishlist, void>({
      query: () => ({ url: endpoints.basket.wishlist }),
      providesTags: [WISHLIST_TAG],
    }),

    addToWishlist: builder.mutation<CustomerWishlist, number>({
      query: (productId) => ({ url: endpoints.basket.wishlistItem(productId), method: 'POST' }),
      onQueryStarted: async (productId, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          basketApi.util.updateQueryData('getWishlist', undefined, (draft) => {
            if (!draft.productIds.includes(productId)) draft.productIds.unshift(productId);
          }),
        );

        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    removeFromWishlist: builder.mutation<CustomerWishlist, number>({
      query: (productId) => ({ url: endpoints.basket.wishlistItem(productId), method: 'DELETE' }),
      onQueryStarted: async (productId, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          basketApi.util.updateQueryData('getWishlist', undefined, (draft) => {
            draft.productIds = draft.productIds.filter((id) => id !== productId);
          }),
        );

        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
  }),
});

export const {
  useGetBasketQuery,
  useAddBasketItemMutation,
  useUpdateBasketItemQuantityMutation,
  useRemoveBasketItemMutation,
  useClearBasketMutation,
  useApplyBasketCouponMutation,
  useRemoveBasketCouponMutation,
  useCheckoutMutation,
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} = basketApi;
