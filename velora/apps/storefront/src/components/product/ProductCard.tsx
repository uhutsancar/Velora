import { motion } from 'framer-motion';
import { Heart, ShoppingBag } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ProductListItem } from '@velora/shared';
import { Badge, PriceBlock, Rating } from '@/components/ui/Display';
import { useAuth, useToast } from '@/hooks';
import { useAddBasketItemMutation } from '@/store/api/basketApi';
import { useWishlist } from '@/hooks/useWishlist';
import { buildSrcSet, mediaUrl, PRODUCT_PLACEHOLDER } from '@/utils/media';
import { cn } from '@/utils/cn';

export interface ProductCardProps {
  product: ProductListItem;
  /** Above-the-fold cards skip lazy loading so the LCP image starts immediately. */
  priority?: boolean;
  className?: string;
}

function ProductCardComponent({ product, priority = false, className }: ProductCardProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();

  const [addItem, { isLoading: adding }] = useAddBasketItemMutation();
  const [hovered, setHovered] = useState(false);

  const primary = mediaUrl(product.primaryImageUrl) ?? PRODUCT_PLACEHOLDER;
  const hover = mediaUrl(product.hoverImageUrl);

  const href = `/urun/${product.slug}`;
  const wishlisted = isWishlisted(product.id);

  const handleQuickAdd = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (!isAuthenticated) {
        toast(t('product.loginToAdd'), 'info');
        return;
      }

      // Products with variants need a deliberate choice, so send the shopper
      // to the detail page instead of guessing which colour they meant.
      if (product.swatches.length > 1) {
        window.location.assign(href);
        return;
      }

      try {
        await addItem({
          productId: product.id,
          productName: product.name,
          unitPrice: product.effectivePrice,
          oldUnitPrice: product.price,
          quantity: 1,
          pictureUrl: product.primaryImageUrl ?? '',
          slug: product.slug,
          variantId: null,
          variantLabel: null,
          availableStock: product.totalStock,
        }).unwrap();

        toast(t('product.addedToCart', { name: product.name }), 'success');
      } catch {
        toast(t('product.addFailed'), 'error');
      }
    },
    [addItem, href, isAuthenticated, product, t, toast],
  );

  const handleWishlist = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (!isAuthenticated) {
        toast(t('product.loginToWishlist'), 'info');
        return;
      }

      void toggleWishlist(product.id);
    },
    [isAuthenticated, product.id, t, toast, toggleWishlist],
  );

  return (
    <article
      className={cn('group relative flex flex-col', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link to={href} className="block focus-visible:ring-offset-4">
        <div className="relative aspect-product overflow-hidden bg-sand-200">
          <motion.img
            src={primary}
            srcSet={buildSrcSet(primary)}
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 45vw"
            alt={product.name}
            loading={priority ? 'eager' : 'lazy'}
            {...{ fetchpriority: priority ? 'high' : 'auto' }}
            decoding="async"
            width={400}
            height={500}
            className="h-full w-full object-cover"
            animate={{ opacity: hover && hovered ? 0 : 1, scale: hovered ? 1.04 : 1 }}
            transition={{ opacity: { duration: 0.35 }, scale: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
          />

          {/* Second image cross-fades in on hover — the classic storefront affordance. */}
          {hover && (
            <motion.img
              src={hover}
              srcSet={buildSrcSet(hover)}
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 45vw"
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              width={400}
              height={500}
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1.04 : 1 }}
              transition={{ opacity: { duration: 0.35 }, scale: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
            />
          )}

          <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {!product.inStock && <Badge variant="soldout">{t('product.outOfStock')}</Badge>}
            {product.inStock && product.discountPercentage > 0 && (
              <Badge variant="sale">%{product.discountPercentage}</Badge>
            )}
            {product.isNew && <Badge variant="new">{t('product.new')}</Badge>}
          </div>

          <button
            type="button"
            onClick={handleWishlist}
            aria-label={wishlisted ? t('product.removeFromWishlist') : t('product.addToWishlist')}
            aria-pressed={wishlisted}
            className={cn(
              'absolute right-3 top-3 flex h-9 w-9 items-center justify-center bg-sand-50/90 backdrop-blur-sm',
              'transition-all duration-300 ease-velora hover:bg-sand-50',
              'lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100',
              wishlisted && 'lg:opacity-100',
            )}
          >
            <Heart className={cn('h-4 w-4', wishlisted ? 'fill-wine-500 text-wine-500' : 'text-ink-700')} />
          </button>

          {product.inStock && (
            <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 ease-velora group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={adding}
                className="label-caps flex h-11 w-full items-center justify-center gap-2 bg-ink-900 text-sand-50 transition-colors hover:bg-ink-800 disabled:opacity-70"
              >
                <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
                {product.swatches.length > 1 ? t('product.selectVariant') : t('product.quickAdd')}
              </button>
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 pt-4">
        {product.brandName && <p className="label-caps text-ink-400">{product.brandName}</p>}

        <h3 className="text-sm font-medium leading-snug text-ink-900">
          <Link to={href} className="link-underline">
            {product.name}
          </Link>
        </h3>

        {product.ratingCount > 0 && (
          <Rating value={product.ratingAverage} count={product.ratingCount} showCount={false} />
        )}

        <PriceBlock price={product.price} discountPrice={product.discountPrice} className="mt-auto pt-1" />

        {product.swatches.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1">
            {product.swatches.slice(0, 5).map((swatch) => (
              <span
                key={swatch.color ?? swatch.colorHex}
                title={swatch.color ?? undefined}
                className="h-3 w-3 rounded-full border border-ink-200"
                style={{ backgroundColor: swatch.colorHex ?? '#D2CEC7' }}
              />
            ))}
            {product.swatches.length > 5 && (
              <span className="text-2xs text-ink-400">+{product.swatches.length - 5}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Memoised: product grids re-render on every filter change, and the card tree
 * (images, motion values) is the expensive part.
 */
export const ProductCard = memo(ProductCardComponent);
