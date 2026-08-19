import type { ProductVariant } from '@velora/shared';

/**
 * Resolves the concrete variant for the current colour/size selection.
 *
 * Returns null when the product has variants but the choice is still incomplete,
 * which is what gates the "add to cart" button on the detail page.
 */
export function resolveVariant(
  variants: ProductVariant[],
  color: string | null,
  size: string | null,
): ProductVariant | null {
  const active = variants.filter((variant) => variant.isActive);
  if (active.length === 0) return null;

  const needsColor = active.some((variant) => variant.color);
  const needsSize = active.some((variant) => variant.size);

  if ((needsColor && !color) || (needsSize && !size)) return null;

  return (
    active.find(
      (variant) => (!needsColor || variant.color === color) && (!needsSize || variant.size === size),
    ) ?? null
  );
}
