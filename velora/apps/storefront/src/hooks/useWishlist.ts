import { useCallback, useMemo } from 'react';
import {
  useAddToWishlistMutation,
  useGetWishlistQuery,
  useRemoveFromWishlistMutation,
} from '@/store/api/basketApi';
import { useAuth } from '@/hooks';

/**
 * Wishlist access for cards and detail pages.
 *
 * The query is skipped for guests so an anonymous visit never fires a 401 —
 * favourites require an account because they are stored server side in Redis.
 */
export function useWishlist() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useGetWishlistQuery(undefined, { skip: !isAuthenticated });
  const [add] = useAddToWishlistMutation();
  const [remove] = useRemoveFromWishlistMutation();

  const productIds = useMemo(() => data?.productIds ?? [], [data]);
  const idSet = useMemo(() => new Set(productIds), [productIds]);

  const isWishlisted = useCallback((productId: number) => idSet.has(productId), [idSet]);

  const toggle = useCallback(
    async (productId: number) => {
      if (idSet.has(productId)) {
        await remove(productId).unwrap();
      } else {
        await add(productId).unwrap();
      }
    },
    [add, idSet, remove],
  );

  return { productIds, isWishlisted, toggle, isLoading, count: productIds.length };
}
