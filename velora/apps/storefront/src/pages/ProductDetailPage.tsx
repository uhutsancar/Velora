import { Heart, Minus, Plus, RotateCcw, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  buildProductSeo,
  COMMERCE,
} from '@velora/shared';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ReviewSection } from '@/components/product/ReviewSection';
import { ProductRail } from '@/components/home/ProductRail';
import { resolveVariant } from '@/components/product/resolveVariant';
import { VariantSelector } from '@/components/product/VariantSelector';
import { Badge, PriceBlock, Rating } from '@/components/ui/Display';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Disclosure, DisclosureGroup } from '@/components/ui/Disclosure';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Seo } from '@/components/seo/Seo';
import { env } from '@/config/env';
import { useAuth, useToast } from '@/hooks';
import { useWishlist } from '@/hooks/useWishlist';
import { useAddBasketItemMutation } from '@/store/api/basketApi';
import {
  useGetProductBySlugQuery,
  useGetRelatedProductsQuery,
  useGetReviewsQuery,
} from '@/store/api/catalogApi';
import { useAppDispatch } from '@/store/hooks';
import { openCartDrawer, recordProductView } from '@/store/slices/uiSlice';
import { cn } from '@/utils/cn';

export default function ProductDetailPage() {
  const { slug = '' } = useParams();
  const { t } = useTranslation();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();

  const { data: product, isLoading, isError, refetch } = useGetProductBySlugQuery(slug, { skip: !slug });
  const { data: related = [] } = useGetRelatedProductsQuery({ slug }, { skip: !slug });
  const { data: reviewPage } = useGetReviewsQuery(
    { productId: product?.id ?? 0, pageSize: 5 },
    { skip: !product },
  );

  const [addItem, { isLoading: adding }] = useAddBasketItemMutation();

  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Reset the selection when navigating between products.
  useEffect(() => {
    setColor(null);
    setSize(null);
    setQuantity(1);
  }, [slug]);

  useEffect(() => {
    if (product) dispatch(recordProductView(product.id));
  }, [product, dispatch]);

  const variant = useMemo(
    () => (product ? resolveVariant(product.variants, color, size) : null),
    [product, color, size],
  );

  const requiresVariant = useMemo(
    () => Boolean(product && product.variants.some((v) => v.isActive)),
    [product],
  );

  const unitPrice = variant ? variant.price : (product?.effectivePrice ?? 0);
  const stock = variant ? variant.stock : (product?.totalStock ?? 0);
  const canAdd = Boolean(product?.inStock) && (!requiresVariant || variant !== null) && stock > 0;

  if (isLoading) return <ProductDetailSkeleton />;

  if (isError || !product) {
    return (
      <div className="container-velora py-24">
        <ErrorState
          title={t('product.notFound')}
          message={t('product.notFoundBody')}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const seo = buildProductSeo(product, env.siteUrl, env.siteName);
  const wishlisted = isWishlisted(product.id);

  const breadcrumbs = [
    { name: 'Ana Sayfa', url: '/' },
    ...product.breadcrumbs.map((crumb) => ({ name: crumb.name, url: `/kategori/${crumb.slug}` })),
    { name: product.name, url: `/urun/${product.slug}` },
  ];

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast(t('product.loginToAdd'), 'info');
      return;
    }

    if (requiresVariant && !variant) {
      toast(t('product.selectVariant'), 'error');
      return;
    }

    try {
      await addItem({
        productId: product.id,
        productName: product.name,
        unitPrice,
        oldUnitPrice: product.price,
        quantity,
        pictureUrl: product.primaryImageUrl ?? '',
        slug: product.slug,
        variantId: variant?.id ?? null,
        variantLabel: variant ? [variant.color, variant.size].filter(Boolean).join(' / ') : null,
        availableStock: stock,
      }).unwrap();

      toast(t('product.addedToCart', { name: product.name }), 'success');
      dispatch(openCartDrawer());
    } catch {
      toast(t('product.addFailed'), 'error');
    }
  };

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.description}
        path={`/urun/${product.slug}`}
        image={product.primaryImageUrl}
        type="product"
        noindex={seo.noindex}
        jsonLd={[
          buildProductJsonLd(product, env.siteUrl, env.siteName, env.currency, reviewPage?.items ?? []),
          buildBreadcrumbJsonLd(breadcrumbs, env.siteUrl),
        ]}
      />

      <div className="container-velora py-8 md:py-12">
        <Breadcrumbs
          className="mb-8"
          items={breadcrumbs.map((crumb, index) => ({
            name: crumb.name,
            href: index === breadcrumbs.length - 1 ? undefined : crumb.url,
          }))}
        />

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductGallery images={product.images} productName={product.name} />

          <div className="lg:sticky lg:top-28 lg:self-start">
            {product.brandName && (
              <Link
                to={`/urunler?brand=${product.brandSlug ?? product.brandName}`}
                className="label-caps text-tan-600 hover:underline"
              >
                {product.brandName}
              </Link>
            )}

            <h1 className="mt-2 font-display text-headline text-balance">{product.name}</h1>

            {product.ratingCount > 0 && (
              <a href="#reviews" className="mt-3 inline-flex">
                <Rating value={product.ratingAverage} count={product.ratingCount} />
              </a>
            )}

            <div className="mt-6 flex items-center gap-3">
              <PriceBlock price={product.price} discountPrice={product.discountPrice} size="lg" />
              {product.discountPercentage > 0 && (
                <Badge variant="sale">%{product.discountPercentage}</Badge>
              )}
            </div>

            {product.shortDescription && (
              <p className="mt-5 text-sm leading-relaxed text-ink-600 text-pretty">
                {product.shortDescription}
              </p>
            )}

            <div className="mt-8">
              <VariantSelector
                variants={product.variants}
                selectedColor={color}
                selectedSize={size}
                onColorChange={setColor}
                onSizeChange={setSize}
              />
            </div>

            <div className="mt-8 flex items-center gap-3">
              <div className="flex items-center border border-ink-200">
                <button
                  type="button"
                  aria-label={t('common.decreaseQuantity')}
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  disabled={quantity <= 1}
                  className="flex h-12 w-12 items-center justify-center text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <span className="w-10 text-center text-sm tabular-nums" aria-live="polite">
                  {quantity}
                </span>

                <button
                  type="button"
                  aria-label={t('common.increaseQuantity')}
                  onClick={() => setQuantity((current) => Math.min(stock || 20, current + 1))}
                  disabled={stock > 0 && quantity >= stock}
                  className="flex h-12 w-12 items-center justify-center text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button size="lg" className="flex-1" loading={adding} disabled={!canAdd} onClick={handleAddToCart}>
                {product.inStock ? t('product.addToCart') : t('product.outOfStock')}
              </Button>

              <button
                type="button"
                aria-label={wishlisted ? t('product.removeFromWishlist') : t('product.addToWishlist')}
                aria-pressed={wishlisted}
                onClick={() => {
                  if (!isAuthenticated) {
                    toast(t('product.loginToWishlist'), 'info');
                    return;
                  }
                  void toggleWishlist(product.id);
                }}
                className="flex h-14 w-14 shrink-0 items-center justify-center border border-ink-200 transition-colors hover:border-ink-900"
              >
                <Heart className={cn('h-5 w-5', wishlisted ? 'fill-wine-500 text-wine-500' : 'text-ink-700')} />
              </button>
            </div>

            {product.inStock && stock > 0 && stock <= 5 && (
              <p className="mt-3 text-xs text-wine-500">{t('product.lowStock', { count: stock })}</p>
            )}

            {requiresVariant && !variant && (
              <p className="mt-3 text-xs text-ink-500">{t('product.selectVariant')}</p>
            )}

            <ul className="mt-8 space-y-2.5 border-t border-ink-100 pt-6 text-sm">
              <li className="flex items-start gap-3 text-ink-600">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-tan-600" aria-hidden />
                <span className="text-pretty">
                  {t('product.shippingNote', {
                    threshold: COMMERCE.freeShippingThreshold,
                    min: COMMERCE.deliveryDays.min,
                    max: COMMERCE.deliveryDays.max,
                  })}
                </span>
              </li>
              <li className="flex items-start gap-3 text-ink-600">
                <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-tan-600" aria-hidden />
                <span className="text-pretty">{t('product.returnNote', { days: COMMERCE.returnDays })}</span>
              </li>
              <li className="flex items-start gap-3 text-ink-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-tan-600" aria-hidden />
                <span className="text-pretty">
                  {t('product.warrantyNote', { years: COMMERCE.warrantyYears })}
                </span>
              </li>
            </ul>

            <DisclosureGroup className="mt-8">
              <Disclosure title={t('footer.shipping')} meta={`${COMMERCE.deliveryDays.min}-${COMMERCE.deliveryDays.max} ${t('common.days')}`}>
                <p>
                  {t('product.shippingDetail', {
                    cutoff: COMMERCE.sameDayCutoff,
                    threshold: COMMERCE.freeShippingThreshold,
                    fee: COMMERCE.shippingFee,
                  })}
                </p>
                <Link to="/yardim/kargo" className="link-underline mt-3 inline-block text-ink-900">
                  {t('product.readMore')}
                </Link>
              </Disclosure>

              <Disclosure title={t('footer.returns')} meta={`${COMMERCE.returnDays} ${t('common.days')}`}>
                <p>{t('product.returnDetail', { days: COMMERCE.returnDays })}</p>
                <Link to="/yardim/iade" className="link-underline mt-3 inline-block text-ink-900">
                  {t('product.readMore')}
                </Link>
              </Disclosure>

              <Disclosure title={t('footer.leatherCare')}>
                <p>{t('product.careDetail')}</p>
                <Link to="/yardim/bakim" className="link-underline mt-3 inline-block text-ink-900">
                  {t('product.readMore')}
                </Link>
              </Disclosure>

              <Disclosure title={t('nav.atelier')}>
                <p className="flex gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-tan-600" aria-hidden />
                  <span>{t('product.warrantyDetail', { years: COMMERCE.warrantyYears })}</span>
                </p>
                <Link to="/atolye" className="link-underline mt-3 inline-block text-ink-900">
                  {t('product.readMore')}
                </Link>
              </Disclosure>
            </DisclosureGroup>

            {(product.sku || variant?.sku) && (
              <p className="mt-6 text-xs text-ink-400">
                {t('product.sku')}: {variant?.sku ?? product.sku}
              </p>
            )}
          </div>
        </div>

        <section className="mt-16 border-t border-ink-100 pt-12">
          <h2 className="text-title">{t('product.description')}</h2>
          <div className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-ink-600 text-pretty">
            {product.description}
          </div>

          {product.tags.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <li key={tag}>
                  <Link
                    to={`/urunler?tag=${encodeURIComponent(tag)}`}
                    className="border border-ink-200 px-3 py-1 text-xs text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-900"
                  >
                    #{tag}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <ReviewSection productId={product.id} />
      </div>

      {related.length > 0 && (
        <ProductRail title={t('product.related')} products={related} />
      )}
    </>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="container-velora py-12">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <Skeleton className="aspect-product w-full" />
        <div className="space-y-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
