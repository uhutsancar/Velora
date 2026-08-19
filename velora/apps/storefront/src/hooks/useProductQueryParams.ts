import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PRODUCT_SORT, type ProductQuery, type ProductSort } from '@velora/shared';
import { PAGE_SIZE } from '@/config/env';
import type { FilterValues } from '@/components/catalog/FilterPanel';

const asList = (value: string | null): string[] =>
  value ? value.split(',').filter((item) => item.length > 0) : [];

const asNumber = (value: string | null): number | undefined => {
  if (value === null || value === '') return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isSort = (value: number | undefined): value is ProductSort =>
  value != null && Object.values(PRODUCT_SORT).includes(value as ProductSort);

/**
 * Keeps catalogue filters in the URL rather than in component state.
 *
 * That makes every filtered view shareable and bookmarkable, gives the browser
 * back button the behaviour shoppers expect, and means RTK Query caches per
 * filter combination for free.
 */
export function useProductQueryParams(defaults: Partial<ProductQuery> = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<FilterValues>(
    () => ({
      brand: asList(searchParams.get('brand')),
      color: asList(searchParams.get('color')),
      size: asList(searchParams.get('size')),
      minPrice: asNumber(searchParams.get('minPrice')),
      maxPrice: asNumber(searchParams.get('maxPrice')),
      inStock: searchParams.get('inStock') === 'true',
      onSale: searchParams.get('onSale') === 'true',
      minRating: asNumber(searchParams.get('minRating')),
    }),
    [searchParams],
  );

  const sortValue = asNumber(searchParams.get('sort'));
  const sort: ProductSort = isSort(sortValue) ? sortValue : PRODUCT_SORT.Newest;

  const pageIndex = asNumber(searchParams.get('page')) ?? 0;

  const query = useMemo<ProductQuery>(
    () => ({
      ...defaults,
      search: searchParams.get('q') ?? defaults.search,
      category: searchParams.get('category') ?? defaults.category,
      brand: filters.brand.length > 0 ? filters.brand.join(',') : undefined,
      color: filters.color.length > 0 ? filters.color.join(',') : undefined,
      size: filters.size.length > 0 ? filters.size.join(',') : undefined,
      tag: searchParams.get('tag') ?? undefined,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      inStock: filters.inStock || undefined,
      onSale: filters.onSale || undefined,
      featured: searchParams.get('featured') === 'true' || undefined,
      minRating: filters.minRating,
      sort,
      pageIndex,
      pageSize: defaults.pageSize ?? PAGE_SIZE,
    }),
    [defaults, filters, pageIndex, searchParams, sort],
  );

  const setFilters = useCallback(
    (next: FilterValues) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);

          const write = (key: string, value: string | undefined) => {
            if (value === undefined || value === '') params.delete(key);
            else params.set(key, value);
          };

          write('brand', next.brand.length > 0 ? next.brand.join(',') : undefined);
          write('color', next.color.length > 0 ? next.color.join(',') : undefined);
          write('size', next.size.length > 0 ? next.size.join(',') : undefined);
          write('minPrice', next.minPrice != null ? String(next.minPrice) : undefined);
          write('maxPrice', next.maxPrice != null ? String(next.maxPrice) : undefined);
          write('inStock', next.inStock ? 'true' : undefined);
          write('onSale', next.onSale ? 'true' : undefined);
          write('minRating', next.minRating != null ? String(next.minRating) : undefined);

          // Any filter change resets paging: page 3 of the old result set is meaningless.
          params.delete('page');

          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setSort = useCallback(
    (value: ProductSort) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          params.set('sort', String(value));
          params.delete('page');
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (value: number) => {
      setSearchParams((current) => {
        const params = new URLSearchParams(current);

        if (value <= 0) params.delete('page');
        else params.set('page', String(value));

        return params;
      });
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams();

        // Keep the identity of the page (search term / category), drop the refinements.
        for (const key of ['q', 'category', 'tag', 'sort'] as const) {
          const value = current.get(key);
          if (value) params.set(key, value);
        }

        return params;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return { query, filters, sort, pageIndex, setFilters, setSort, setPage, clearFilters };
}
