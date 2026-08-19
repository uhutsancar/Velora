import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ProductFacets } from '@velora/shared';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Input';
import { Price } from '@/components/ui/Display';
import { cn } from '@/utils/cn';

export interface FilterValues {
  brand: string[];
  color: string[];
  size: string[];
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  inStock: boolean;
  onSale: boolean;
  minRating?: number | undefined;
}

export interface FilterPanelProps {
  facets?: ProductFacets;
  values: FilterValues;
  onChange: (next: FilterValues) => void;
  onClear: () => void;
  loading?: boolean;
  className?: string;
}

/** Toggles a value in a string array filter. */
const toggle = (list: string[], value: string): string[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

export function FilterPanel({ facets, values, onChange, onClear, loading, className }: FilterPanelProps) {
  const { t } = useTranslation();

  const activeCount =
    values.brand.length +
    values.color.length +
    values.size.length +
    (values.inStock ? 1 : 0) +
    (values.onSale ? 1 : 0) +
    (values.minRating ? 1 : 0) +
    (values.minPrice != null || values.maxPrice != null ? 1 : 0);

  return (
    <aside className={cn('space-y-8', className)} aria-label={t('catalog.filters')}>
      {activeCount > 0 && (
        <div className="flex items-center justify-between border-b border-ink-100 pb-4">
          <span className="text-sm text-ink-600">{activeCount} filtre aktif</span>
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-wine-500 hover:underline"
          >
            <X className="h-3 w-3" /> {t('catalog.clearFilters')}
          </button>
        </div>
      )}

      <FilterGroup title={t('catalog.priceRange')}>
        {facets && (
          <p className="mb-3 text-xs text-ink-400">
            <Price value={facets.minPrice} size="sm" /> – <Price value={facets.maxPrice} size="sm" />
          </p>
        )}

        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Min"
            aria-label="Minimum fiyat"
            value={values.minPrice ?? ''}
            onChange={(event) =>
              onChange({
                ...values,
                minPrice: event.target.value === '' ? undefined : Number(event.target.value),
              })
            }
            className="w-full border-b border-ink-200 bg-transparent py-2 text-sm focus:border-ink-900 focus:outline-none"
          />
          <span className="text-ink-300">–</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Max"
            aria-label="Maksimum fiyat"
            value={values.maxPrice ?? ''}
            onChange={(event) =>
              onChange({
                ...values,
                maxPrice: event.target.value === '' ? undefined : Number(event.target.value),
              })
            }
            className="w-full border-b border-ink-200 bg-transparent py-2 text-sm focus:border-ink-900 focus:outline-none"
          />
        </div>
      </FilterGroup>

      {facets && facets.brands.length > 0 && (
        <FilterGroup title={t('catalog.brands')}>
          <ul className="space-y-2.5">
            {facets.brands.map((brand) => (
              <li key={brand.value}>
                <Checkbox
                  checked={values.brand.includes(brand.value)}
                  onChange={() => onChange({ ...values, brand: toggle(values.brand, brand.value) })}
                  label={
                    <span className="flex w-full items-center justify-between gap-3">
                      {brand.label}
                      <span className="text-xs text-ink-300">{brand.count}</span>
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        </FilterGroup>
      )}

      {facets && facets.colors.length > 0 && (
        <FilterGroup title={t('catalog.colors')}>
          <ul className="space-y-2.5">
            {facets.colors.map((color) => (
              <li key={color.value}>
                <Checkbox
                  checked={values.color.includes(color.value)}
                  onChange={() => onChange({ ...values, color: toggle(values.color, color.value) })}
                  label={
                    <span className="flex w-full items-center justify-between gap-3">
                      {color.label}
                      <span className="text-xs text-ink-300">{color.count}</span>
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        </FilterGroup>
      )}

      {facets && facets.sizes.length > 0 && (
        <FilterGroup title={t('catalog.sizes')}>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((size) => {
              const active = values.size.includes(size.value);

              return (
                <button
                  key={size.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ ...values, size: toggle(values.size, size.value) })}
                  className={cn(
                    'min-w-11 border px-3 py-2 text-xs transition-colors',
                    active
                      ? 'border-ink-900 bg-ink-900 text-sand-50'
                      : 'border-ink-200 text-ink-700 hover:border-ink-900',
                  )}
                >
                  {size.label}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title={t('catalog.availability')}>
        <div className="space-y-2.5">
          <Checkbox
            checked={values.inStock}
            onChange={(event) => onChange({ ...values, inStock: event.target.checked })}
            label={t('catalog.onlyInStock')}
          />
          <Checkbox
            checked={values.onSale}
            onChange={(event) => onChange({ ...values, onSale: event.target.checked })}
            label={t('catalog.onlyOnSale')}
          />
        </div>
      </FilterGroup>

      <FilterGroup title={t('catalog.minRating')}>
        <div className="flex gap-2">
          {[4, 3, 2].map((rating) => (
            <button
              key={rating}
              type="button"
              aria-pressed={values.minRating === rating}
              onClick={() =>
                onChange({ ...values, minRating: values.minRating === rating ? undefined : rating })
              }
              className={cn(
                'border px-3 py-1.5 text-xs transition-colors',
                values.minRating === rating
                  ? 'border-ink-900 bg-ink-900 text-sand-50'
                  : 'border-ink-200 text-ink-700 hover:border-ink-900',
              )}
            >
              {rating}+ ★
            </button>
          ))}
        </div>
      </FilterGroup>

      {loading && <p className="text-xs text-ink-400">{t('common.loading')}</p>}

      {activeCount > 0 && (
        <Button variant="outline" fullWidth onClick={onClear}>
          {t('catalog.clearFilters')}
        </Button>
      )}
    </aside>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="label-caps mb-3 text-ink-900">{title}</h3>
      {children}
    </div>
  );
}
