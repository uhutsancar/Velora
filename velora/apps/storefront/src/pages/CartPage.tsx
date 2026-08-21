import { Formik, Form, Field, type FieldProps } from 'formik';
import { Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { couponSchema, zodValidator, type CouponFormValues } from '@velora/shared';
import { Button } from '@/components/ui/Button';
import { Price } from '@/components/ui/Display';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { Seo } from '@/components/seo/Seo';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/config/env';
import { useAuth, useToast } from '@/hooks';
import {
  useApplyBasketCouponMutation,
  useGetBasketQuery,
  useRemoveBasketCouponMutation,
  useRemoveBasketItemMutation,
  useUpdateBasketItemQuantityMutation,
} from '@/store/api/basketApi';
import { useValidateCouponMutation } from '@/store/api/catalogApi';
import { mediaUrl, PRODUCT_PLACEHOLDER } from '@/utils/media';

export default function CartPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { isAuthenticated } = useAuth();

  const { data: basket, isLoading } = useGetBasketQuery(undefined, { skip: !isAuthenticated });
  const [updateQuantity] = useUpdateBasketItemQuantityMutation();
  const [removeItem] = useRemoveBasketItemMutation();
  const [validateCoupon, { isLoading: validating }] = useValidateCouponMutation();
  const [applyCoupon] = useApplyBasketCouponMutation();
  const [removeCoupon] = useRemoveBasketCouponMutation();

  const items = basket?.items ?? [];
  const subtotal = basket?.subtotal ?? 0;
  const discount = basket?.discountAmount ?? 0;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE;
  const total = Math.max(0, subtotal - discount) + shipping;

  const submitCoupon = async (values: CouponFormValues, reset: () => void) => {
    try {
      // The discount amount is computed by CatalogService, then stored on the basket;
      // OrderService re-derives it at checkout so a tampered value cannot stick.
      const result = await validateCoupon({ code: values.code, subtotal }).unwrap();

      if (!result.isValid) {
        toast(result.message ?? t('cart.couponInvalid'), 'error');
        return;
      }

      await applyCoupon({ code: result.code ?? values.code, discountAmount: result.discountAmount }).unwrap();

      toast(t('cart.couponApplied'), 'success');
      reset();
    } catch {
      toast(t('cart.couponFailed'), 'error');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container-velora py-20">
        <Seo title={t('cart.title')} description={t('cart.metaDescription')} path="/sepet" noindex />
        <EmptyState
          icon={<ShoppingBag className="h-10 w-10" />}
          title={t('cart.empty')}
          description={t('cart.loginToView')}
          action={<Button to="/giris">{t('nav.login')}</Button>}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="container-velora py-10 md:py-16">
      <Seo title={t('cart.title')} description={t('cart.metaDescription')} path="/sepet" noindex />

      <h1 className="text-headline">{t('cart.title')}</h1>

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-10 w-10" />}
          title={t('cart.empty')}
          description={t('cart.emptyBody')}
          action={<Button to="/urunler">{t('cart.continueShopping')}</Button>}
        />
      ) : (
        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_22rem]">
          <ul className="divide-y divide-ink-100 border-y border-ink-100">
            {items.map((item) => (
              <li key={item.id} className="flex gap-5 py-6">
                <Link
                  to={item.slug ? `/urun/${item.slug}` : '#'}
                  className="h-32 w-24 shrink-0 overflow-hidden bg-sand-200 sm:h-40 sm:w-32"
                >
                  <img
                    src={mediaUrl(item.pictureUrl) ?? PRODUCT_PLACEHOLDER}
                    alt={item.productName}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </Link>

                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link
                        to={item.slug ? `/urun/${item.slug}` : '#'}
                        className="font-medium text-ink-900 hover:underline"
                      >
                        {item.productName}
                      </Link>
                      {item.variantLabel && (
                        <p className="mt-1 text-sm text-ink-400">{item.variantLabel}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void removeItem(item.id)}
                      aria-label={`${item.productName} ${t('cart.remove')}`}
                      className="text-ink-300 transition-colors hover:text-wine-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-4">
                    <div className="flex items-center border border-ink-200">
                      <button
                        type="button"
                        aria-label={t('common.decreaseQuantity')}
                        onClick={() => void updateQuantity({ lineId: item.id, quantity: item.quantity - 1 })}
                        className="flex h-10 w-10 items-center justify-center text-ink-600 transition-colors hover:bg-ink-100"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-10 text-center text-sm tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={t('common.increaseQuantity')}
                        onClick={() => void updateQuantity({ lineId: item.id, quantity: item.quantity + 1 })}
                        className="flex h-10 w-10 items-center justify-center text-ink-600 transition-colors hover:bg-ink-100"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <Price value={item.unitPrice * item.quantity} size="lg" />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="border border-ink-100 bg-white p-6">
              <h2 className="label-caps text-ink-900">{t('checkout.summary')}</h2>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-500">{t('cart.subtotal')}</dt>
                  <dd>
                    <Price value={subtotal} size="sm" />
                  </dd>
                </div>

                {discount > 0 && (
                  <div className="flex items-center justify-between text-moss-500">
                    <dt className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" aria-hidden />
                      {basket?.couponCode}
                    </dt>
                    <dd className="flex items-center gap-2">
                      <span>
                        -<Price value={discount} size="sm" />
                      </span>
                      <button
                        type="button"
                        onClick={() => void removeCoupon()}
                        aria-label={t('cart.removeCoupon')}
                        className="text-ink-300 hover:text-wine-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </dd>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <dt className="text-ink-500">{t('cart.shipping')}</dt>
                  <dd>
                    {shipping === 0 ? (
                      <span className="text-moss-500">{t('cart.freeShipping')}</span>
                    ) : (
                      <Price value={shipping} size="sm" />
                    )}
                  </dd>
                </div>

                <div className="flex items-center justify-between border-t border-ink-100 pt-3">
                  <dt className="label-caps text-ink-900">{t('cart.total')}</dt>
                  <dd>
                    <Price value={total} size="lg" />
                  </dd>
                </div>
              </dl>

              {!basket?.couponCode && (
                <Formik<CouponFormValues>
                  initialValues={{ code: '' }}
                  validate={zodValidator<CouponFormValues>(couponSchema)}
                  onSubmit={(values, helpers) => submitCoupon(values, () => helpers.resetForm())}
                >
                  <Form className="mt-6 flex gap-2">
                    <Field name="code">
                      {({ field, meta }: FieldProps) => (
                        <div className="flex-1">
                          <input
                            {...field}
                            placeholder={t('cart.couponPlaceholder')}
                            aria-label={t('cart.couponPlaceholder')}
                            className="w-full border-b border-ink-200 bg-transparent py-2.5 text-sm uppercase focus:border-ink-900 focus:outline-none"
                          />
                          {meta.touched && meta.error && (
                            <p className="mt-1 text-xs text-wine-500">{meta.error}</p>
                          )}
                        </div>
                      )}
                    </Field>

                    <Button type="submit" variant="outline" size="sm" loading={validating}>
                      {t('cart.applyCoupon')}
                    </Button>
                  </Form>
                </Formik>
              )}

              <Button to="/odeme" fullWidth size="lg" className="mt-6">
                {t('cart.checkout')}
              </Button>

              <Button to="/urunler" variant="ghost" fullWidth size="sm" className="mt-2">
                {t('cart.continueShopping')}
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
