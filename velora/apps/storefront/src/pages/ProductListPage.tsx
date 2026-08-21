import { SlidersHorizontal } from 'lucide-react';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PRODUCT_SORT, type ProductSort } from '@velora/shared';
import { FilterPanel } from '@/components/catalog/FilterPanel';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Overlay';
import { ErrorState } from '@/components/ui/Feedback';
import { Seo } from '@/components/seo/Seo';
import { useProductQueryParams } from '@/hooks/useProductQueryParams';
import {
  useGetProductFacetsQuery,
  useSearchProductsInfiniteQuery,
} from '@/store/api/catalogApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectFiltersOpen, toggleFilters } from '@/store/slices/uiSlice';

const SORT_OPTIONS: Array<{ value: ProductSort; labelKey: string }> = [
  { value: PRODUCT_SORT.Newest, labelKey: 'catalog.sortNewest' },
  { value: PRODUCT_SORT.BestSelling, labelKey: 'catalog.sortBestSelling' },
  { value: PRODUCT_SORT.PriceAsc, labelKey: 'catalog.sortPriceAsc' },
  { value: PRODUCT_SORT.PriceDesc, labelKey: 'catalog.sortPriceDesc' },
  { value: PRODUCT_SORT.Rating, labelKey: 'catalog.sortRating' },
  { value: PRODUCT_SORT.NameAsc, labelKey: 'catalog.sortNameAsc' },
];

export interface ProductListPageProps {
  /** Set by the category route so the heading and SEO reflect the category. */
  categorySlug?: string;
  title?: string;
  description?: string;
  path?: string;
  /**
   * The category route renders its own hero heading, so the listing drops to an
   * h2 there. Exactly one h1 per page keeps the outline correct for screen
   * readers and for search engines.
   */
  headingLevel?: 1 | 2;
}

export default function ProductListPage({
  categorySlug,
  title,
  description,
  path = '/urunler',
  headingLevel = 1,
}: ProductListPageProps = {}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const filtersOpen = useAppSelector(selectFiltersOpen);
  const [searchParams] = useSearchParams();

  const { query, filters, sort, pageIndex, setFilters, setSort, setPage, clearFilters } =
    useProductQueryParams(categorySlug ? { category: categorySlug } : {});

  const { data, isLoading, isFetching, isError, refetch } = useSearchProductsInfiniteQuery(query);
  const { data: facets, isFetching: facetsLoading } = useGetProductFacetsQuery({
    search: query.search,
    category: query.category,
    tag: query.tag,
  });

  const loadMore = useCallback(() => setPage(pageIndex + 1), [pageIndex, setPage]);

  const products = data?.items ?? [];
  const total = data?.totalCount ?? 0;
  const hasMore = data ? products.length < total : false;

  const heading = title ?? (searchParams.get('q') ? `"${searchParams.get('q')}"` : t('catalog.title'));

  const Heading = headingLevel === 1 ? 'h1' : 'h2';

  const filterPanel = (
    <FilterPanel
      facets={facets}
      values={filters}
      onChange={setFilters}
      onClear={clearFilters}
      loading={facetsLoading}
    />
  );

  return (
    <>
      <Seo
        title={heading}
        description={description ?? t('catalog.metaDescription')}
        path={path}
        // Filtered/paged permutations must not compete with the canonical listing.
        noindex={pageIndex > 0 || searchParams.toString().length > 0}
      />

      <div className="container-velora py-10 md:py-16">
        <header className="mb-8 flex flex-col gap-2 border-b border-ink-100 pb-6">
          <Heading className="text-headline">{heading}</Heading>
          <p className="text-sm text-ink-500">{t('common.results', { count: total })}</p>
        </header>

        <div className="flex items-center justify-between gap-4 lg:hidden">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<SlidersHorizontal className="h-4 w-4" />}
            onClick={() => dispatch(toggleFilters(true))}
          >
            {t('catalog.filters')}
          </Button>

          <SortSelect value={sort} onChange={setSort} />
        </div>

        <div className="mt-6 grid gap-10 lg:mt-0 lg:grid-cols-[16rem_1fr] lg:gap-12">
          <div className="hidden lg:block">
            {/* Sticky so filters stay reachable through a long result list. */}
            <div className="sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto pr-2">{filterPanel}</div>
          </div>

          <div>
            <div className="mb-6 hidden items-center justify-end lg:flex">
              <SortSelect value={sort} onChange={setSort} />
            </div>

            {isError ? (
              <ErrorState onRetry={() => void refetch()} />
            ) : (
              <>
                <ProductGrid products={products} loading={isLoading} columns={3} />

                {hasMore && (
                  <div className="mt-14 flex justify-center">
                    <Button variant="outline" size="lg" loading={isFetching} onClick={loadMore}>
                      {t('catalog.loadMore')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Drawer
        open={filtersOpen}
        onClose={() => dispatch(toggleFilters(false))}
        title={t('catalog.filters')}
        side="left"
        footer={
          <Button fullWidth onClick={() => dispatch(toggleFilters(false))}>
            {t('common.results', { count: total })}
          </Button>
        }
      >
        <div className="px-6 py-6">{filterPanel}</div>
      </Drawer>
    </>
  );
}

function SortSelect({ value, onChange }: { value: ProductSort; onChange: (next: ProductSort) => void }) {
  const { t } = useTranslation();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="label-caps text-ink-400">{t('catalog.sortBy')}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value) as ProductSort)}
        className="border-b border-ink-200 bg-transparent py-1.5 text-sm text-ink-900 focus:border-ink-900 focus:outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </label>
  );
}
