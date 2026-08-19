import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProductVariant } from '@velora/shared';
import { cn } from '@/utils/cn';

export interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedColor: string | null;
  selectedSize: string | null;
  onColorChange: (color: string | null) => void;
  onSizeChange: (size: string | null) => void;
}

/**
 * Colour and size pickers driven by the variant matrix.
 *
 * Sizes are filtered by the chosen colour and disabled when that combination has
 * no stock, so the shopper cannot build an unbuyable selection.
 */
export function VariantSelector({
  variants,
  selectedColor,
  selectedSize,
  onColorChange,
  onSizeChange,
}: VariantSelectorProps) {
  const { t } = useTranslation();

  const active = useMemo(() => variants.filter((variant) => variant.isActive), [variants]);

  const colors = useMemo(() => {
    const map = new Map<string, { color: string; colorHex: string | null; inStock: boolean }>();

    for (const variant of active) {
      if (!variant.color) continue;

      const existing = map.get(variant.color);

      map.set(variant.color, {
        color: variant.color,
        colorHex: variant.colorHex,
        inStock: (existing?.inStock ?? false) || variant.stock > 0,
      });
    }

    return [...map.values()];
  }, [active]);

  const sizes = useMemo(() => {
    const relevant = selectedColor ? active.filter((v) => v.color === selectedColor) : active;
    const map = new Map<string, { size: string; inStock: boolean }>();

    for (const variant of relevant) {
      if (!variant.size) continue;

      const existing = map.get(variant.size);
      map.set(variant.size, {
        size: variant.size,
        inStock: (existing?.inStock ?? false) || variant.stock > 0,
      });
    }

    return [...map.values()];
  }, [active, selectedColor]);

  if (colors.length === 0 && sizes.length === 0) return null;

  return (
    <div className="space-y-6">
      {colors.length > 0 && (
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <span className="label-caps text-ink-900">{t('product.color')}</span>
            {selectedColor && <span className="text-sm text-ink-500">{selectedColor}</span>}
          </div>

          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={t('product.color')}>
            {colors.map((option) => {
              const selected = selectedColor === option.color;

              return (
                <button
                  key={option.color}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={option.color}
                  disabled={!option.inStock}
                  onClick={() => {
                    onColorChange(selected ? null : option.color);
                    // Changing colour can invalidate the current size.
                    onSizeChange(null);
                  }}
                  className={cn(
                    'relative h-9 w-9 rounded-full border-2 transition-all duration-200',
                    selected ? 'border-ink-900 ring-1 ring-ink-900 ring-offset-2' : 'border-ink-200',
                    !option.inStock && 'cursor-not-allowed opacity-40',
                  )}
                  style={{ backgroundColor: option.colorHex ?? '#D2CEC7' }}
                >
                  {!option.inStock && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="h-px w-8 rotate-45 bg-ink-500" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <span className="label-caps text-ink-900">{t('product.size')}</span>
          </div>

          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('product.size')}>
            {sizes.map((option) => {
              const selected = selectedSize === option.size;

              return (
                <button
                  key={option.size}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!option.inStock}
                  onClick={() => onSizeChange(selected ? null : option.size)}
                  className={cn(
                    'min-w-12 border px-4 py-2.5 text-sm transition-colors',
                    selected
                      ? 'border-ink-900 bg-ink-900 text-sand-50'
                      : 'border-ink-200 text-ink-800 hover:border-ink-900',
                    !option.inStock && 'cursor-not-allowed border-ink-100 text-ink-300 line-through hover:border-ink-100',
                  )}
                >
                  {option.size}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
