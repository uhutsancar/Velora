import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { Price } from '@/components/ui/Display';
import { Drawer } from '@/components/ui/Overlay';
import { FREE_SHIPPING_THRESHOLD } from '@/config/env';
import { useAuth } from '@/hooks';
import {
  useGetBasketQuery,
  useRemoveBasketItemMutation,
  useUpdateBasketItemQuantityMutation,
} from '@/store/api/basketApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { closeCartDrawer, selectCartDrawerOpen } from '@/store/slices/uiSlice';
import { mediaUrl, PRODUCT_PLACEHOLDER } from '@/utils/media';

export function CartDrawer() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectCartDrawerOpen);
  const { isAuthenticated } = useAuth();

  const { data: basket, isLoading } = useGetBasketQuery(undefined, { skip: !isAuthenticated || !open });
  const [updateQuantity] = useUpdateBasketItemQuantityMutation();
  const [removeItem] = useRemoveBasketItemMutation();

  const close = () => dispatch(closeCartDrawer());

  const items = basket?.items ?? [];
  const subtotal = basket?.subtotal ?? 0;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <Drawer
      open={open}
      onClose={close}
      title={`${t('cart.title')}${items.length > 0 ? ` (${basket?.totalQuantity ?? 0})` : ''}`}
      footer={
        items.length > 0 ? (
          <div className="space-y-4">
            {basket && basket.discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-moss-500">
                <span>
                  {t('cart.discount')} {basket.couponCode && `(${basket.couponCode})`}
                </span>
                <span>-{<Price value={basket.discountAmount} size="sm" />}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="label-caps text-ink-500">{t('cart.total')}</span>
              <Price value={basket?.total ?? 0} size="lg" />
            </div>

            <Button to="/sepet" fullWidth onClick={close}>
              {t('cart.title')}
            </Button>

            <Button to="/odeme" variant="secondary" fullWidth onClick={close}>
              {t('cart.checkout')}
            </Button>
          </div>
        ) : undefined
      }
    >
      {!isAuthenticated ? (
        <EmptyState
          icon={<ShoppingBag className="h-10 w-10" />}
          title={t('cart.empty')}
          description="Sepetinizi görüntülemek için giriş yapın."
          action={
            <Button to="/giris" onClick={close}>
              {t('nav.login')}
            </Button>
          }
        />
      ) : isLoading ? (
        <div className="flex h-full items-center justify-center">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-10 w-10" />}
          title={t('cart.empty')}
          description={t('cart.emptyBody')}
          action={
            <Button to="/urunler" onClick={close}>
              {t('cart.continueShopping')}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col">
          {/* Free-shipping progress: a concrete nudge, not a decoration. */}
          <div className="border-b border-ink-100 px-6 py-4">
            {remainingForFreeShipping > 0 ? (
              <p className="text-xs text-ink-600">
                Ücretsiz kargoya <Price value={remainingForFreeShipping} size="sm" /> kaldı
              </p>
            ) : (
              <p className="text-xs font-medium text-moss-500">Kargonuz ücretsiz</p>
            )}

            <div className="mt-2 h-0.5 w-full bg-ink-100">
              <div
                className="h-full bg-tan-500 transition-[width] duration-500 ease-velora"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <ul className="divide-y divide-ink-100">
            {items.map((item) => (
              <li key={item.id} className="flex gap-4 px-6 py-5">
                <Link
                  to={item.slug ? `/urun/${item.slug}` : '#'}
                  onClick={close}
                  className="h-24 w-20 shrink-0 overflow-hidden bg-sand-200"
                >
                  <img
                    src={mediaUrl(item.pictureUrl) ?? PRODUCT_PLACEHOLDER}
                    alt={item.productName}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </Link>

                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        to={item.slug ? `/urun/${item.slug}` : '#'}
                        onClick={close}
                        className="text-sm font-medium text-ink-900 hover:underline"
                      >
                        {item.productName}
                      </Link>
                      {item.variantLabel && (
                        <p className="mt-0.5 text-xs text-ink-400">{item.variantLabel}</p>
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

                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center border border-ink-200">
                      <button
                        type="button"
                        aria-label="Adet azalt"
                        onClick={() =>
                          void updateQuantity({ lineId: item.id, quantity: item.quantity - 1 })
                        }
                        className="flex h-8 w-8 items-center justify-center text-ink-600 transition-colors hover:bg-ink-100"
                      >
                        <Minus className="h-3 w-3" />
                      </button>

                      <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>

                      <button
                        type="button"
                        aria-label="Adet artır"
                        onClick={() =>
                          void updateQuantity({ lineId: item.id, quantity: item.quantity + 1 })
                        }
                        className="flex h-8 w-8 items-center justify-center text-ink-600 transition-colors hover:bg-ink-100"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <Price value={item.unitPrice * item.quantity} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Drawer>
  );
}
