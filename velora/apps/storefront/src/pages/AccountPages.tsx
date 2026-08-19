import { Formik, Form, Field, type FieldProps } from 'formik';
import { Heart, LogOut, MapPin, Package, Plus, ShieldCheck, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  addressSchema,
  changePasswordSchema,
  formatDate,
  isNormalizedApiError,
  localeFor,
  profileSchema,
  zodValidator,
  type AddressFormValues,
  type ChangePasswordFormValues,
  type ProfileFormValues,
} from '@velora/shared';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Price } from '@/components/ui/Display';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Overlay';
import { Seo } from '@/components/seo/Seo';
import { useAuth, useToast } from '@/hooks';
import { useWishlist } from '@/hooks/useWishlist';
import {
  useCancelOrderMutation,
  useChangePasswordMutation,
  useCreateAddressMutation,
  useDeleteAddressMutation,
  useGetAddressesQuery,
  useGetMyOrdersQuery,
  useGetOrderByIdQuery,
  useSetDefaultAddressMutation,
  useUpdateAddressMutation,
  useUpdateProfileMutation,
} from '@/store/api/accountApi';
import { useGetProductsByIdsQuery } from '@/store/api/catalogApi';
import { useAppDispatch } from '@/store/hooks';
import { logout, setUser } from '@/store/slices/authSlice';
import { mediaUrl, PRODUCT_PLACEHOLDER } from '@/utils/media';
import { cn } from '@/utils/cn';

interface AccountNavItem {
  to: string;
  /** Only the index route matches exactly; the others match their subtree. */
  end: boolean;
  icon: typeof User;
  labelKey: string;
}

const NAV_ITEMS: AccountNavItem[] = [
  { to: '/hesabim', end: true, icon: User, labelKey: 'account.profile' },
  { to: '/hesabim/siparisler', end: false, icon: Package, labelKey: 'account.orders' },
  { to: '/hesabim/adresler', end: false, icon: MapPin, labelKey: 'account.addresses' },
  { to: '/hesabim/favoriler', end: false, icon: Heart, labelKey: 'account.wishlist' },
  { to: '/hesabim/guvenlik', end: false, icon: ShieldCheck, labelKey: 'account.security' },
];

export function AccountLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  return (
    <div className="container-velora py-10 md:py-16">
      <Seo title={t('account.title')} description="Velora hesabınız" path="/hesabim" noindex />

      <header className="border-b border-ink-100 pb-6">
        <h1 className="text-headline">{t('account.title')}</h1>
        {user && <p className="mt-1 text-sm text-ink-500">{user.email}</p>}
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-14">
        <nav aria-label={t('account.title')}>
          <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0">
            {NAV_ITEMS.map(({ to, end, icon: Icon, labelKey }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 whitespace-nowrap px-4 py-3 text-sm transition-colors lg:border-l-2',
                      isActive
                        ? 'border-ink-900 bg-sand-100 font-medium text-ink-900 lg:bg-transparent'
                        : 'border-transparent text-ink-500 hover:text-ink-900',
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {t(labelKey)}
                </NavLink>
              </li>
            ))}

            <li>
              <button
                type="button"
                onClick={() => void dispatch(logout())}
                className="flex w-full items-center gap-3 whitespace-nowrap px-4 py-3 text-sm text-wine-500 transition-colors hover:text-wine-600 lg:border-l-2 lg:border-transparent"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                {t('nav.logout')}
              </button>
            </li>
          </ul>
        </nav>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { t } = useTranslation();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  if (!user) return <Spinner />;

  return (
    <section>
      <h2 className="text-title">{t('account.profile')}</h2>

      <Formik<ProfileFormValues>
        initialValues={{
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber ?? '',
        }}
        validate={zodValidator<ProfileFormValues>(profileSchema)}
        onSubmit={async (values) => {
          try {
            const updated = await updateProfile({
              firstName: values.firstName,
              lastName: values.lastName,
              phoneNumber: values.phoneNumber || null,
            }).unwrap();

            dispatch(setUser(updated));
            toast(t('account.saved'), 'success');
          } catch {
            toast('Bilgiler güncellenemedi', 'error');
          }
        }}
      >
        <Form className="mt-6 max-w-md space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field name="firstName">
              {({ field, meta }: FieldProps) => (
                <Input {...field} label={t('account.firstName')} error={meta.touched ? meta.error : undefined} required />
              )}
            </Field>
            <Field name="lastName">
              {({ field, meta }: FieldProps) => (
                <Input {...field} label={t('account.lastName')} error={meta.touched ? meta.error : undefined} required />
              )}
            </Field>
          </div>

          <Input label={t('account.email')} value={user.email} disabled readOnly hint="E-posta adresi değiştirilemez" />

          <Field name="phoneNumber">
            {({ field, meta }: FieldProps) => (
              <Input {...field} type="tel" label={t('account.phone')} error={meta.touched ? meta.error : undefined} />
            )}
          </Field>

          <Button type="submit" loading={isLoading}>
            {t('common.save')}
          </Button>
        </Form>
      </Formik>
    </section>
  );
}

export function SecurityPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  return (
    <section>
      <h2 className="text-title">{t('account.changePassword')}</h2>

      <Formik<ChangePasswordFormValues>
        initialValues={{ currentPassword: '', newPassword: '', confirmPassword: '' }}
        validate={zodValidator<ChangePasswordFormValues>(changePasswordSchema)}
        onSubmit={async (values, helpers) => {
          try {
            await changePassword({
              currentPassword: values.currentPassword,
              newPassword: values.newPassword,
            }).unwrap();

            toast('Şifreniz güncellendi. Diğer oturumlar kapatıldı.', 'success');
            helpers.resetForm();
          } catch (error) {
            toast(isNormalizedApiError(error) ? error.message : 'Şifre değiştirilemedi', 'error');
          }
        }}
      >
        <Form className="mt-6 max-w-md space-y-4">
          <Field name="currentPassword">
            {({ field, meta }: FieldProps) => (
              <Input
                {...field}
                type="password"
                autoComplete="current-password"
                label={t('account.currentPassword')}
                error={meta.touched ? meta.error : undefined}
                required
              />
            )}
          </Field>

          <Field name="newPassword">
            {({ field, meta }: FieldProps) => (
              <Input
                {...field}
                type="password"
                autoComplete="new-password"
                label={t('account.newPassword')}
                error={meta.touched ? meta.error : undefined}
                required
              />
            )}
          </Field>

          <Field name="confirmPassword">
            {({ field, meta }: FieldProps) => (
              <Input
                {...field}
                type="password"
                autoComplete="new-password"
                label={t('account.confirmPassword')}
                error={meta.touched ? meta.error : undefined}
                required
              />
            )}
          </Field>

          <Button type="submit" loading={isLoading}>
            {t('common.save')}
          </Button>
        </Form>
      </Formik>
    </section>
  );
}

const emptyAddress: AddressFormValues = {
  title: '',
  firstName: '',
  lastName: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  country: 'Turkiye',
  zipCode: '',
  isDefault: false,
};

export function AddressesPage() {
  const { t } = useTranslation();
  const toast = useToast();

  const { data: addresses = [], isLoading } = useGetAddressesQuery();
  const [createAddress, { isLoading: creating }] = useCreateAddressMutation();
  const [updateAddress, { isLoading: updating }] = useUpdateAddressMutation();
  const [deleteAddress] = useDeleteAddressMutation();
  const [setDefaultAddress] = useSetDefaultAddressMutation();

  const [editing, setEditing] = useState<{ id: string | null; values: AddressFormValues } | null>(null);

  if (isLoading) return <Spinner />;

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-title">{t('account.addresses')}</h2>
        <Button
          size="sm"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setEditing({ id: null, values: emptyAddress })}
        >
          {t('checkout.newAddress')}
        </Button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-8 w-8" />}
          title={t('account.noAddresses')}
          description="Siparişlerinizi hızlandırmak için bir adres ekleyin."
        />
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="border border-ink-100 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="label-caps text-ink-900">{address.title}</span>
                  {address.isDefault && (
                    <span className="ml-2 bg-moss-500 px-1.5 py-0.5 text-[10px] uppercase tracking-label text-white">
                      {t('account.defaultAddress')}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void deleteAddress(address.id)}
                  aria-label={`${address.title} adresini sil`}
                  className="text-ink-300 transition-colors hover:text-wine-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-3 text-sm text-ink-700">
                {address.firstName} {address.lastName}
              </p>
              <p className="mt-1 text-sm text-ink-500">
                {address.street}, {address.state} / {address.city} {address.zipCode}
              </p>
              <p className="mt-1 text-sm text-ink-400">{address.phone}</p>

              <div className="mt-4 flex gap-3">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setEditing({ id: address.id, values: { ...address } })}
                >
                  {t('common.edit')}
                </Button>

                {!address.isDefault && (
                  <Button variant="link" size="sm" onClick={() => void setDefaultAddress(address.id)}>
                    {t('account.setDefault')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? t('common.edit') : t('checkout.newAddress')}
      >
        {editing && (
          <Formik<AddressFormValues>
            initialValues={editing.values}
            validate={zodValidator<AddressFormValues>(addressSchema)}
            onSubmit={async (values) => {
              try {
                if (editing.id) await updateAddress({ id: editing.id, body: values }).unwrap();
                else await createAddress(values).unwrap();

                toast(t('common.save'), 'success');
                setEditing(null);
              } catch {
                toast('Adres kaydedilemedi', 'error');
              }
            }}
          >
            <Form className="space-y-3">
              <AddressField name="title" label={t('account.addressTitle')} />

              <div className="grid grid-cols-2 gap-4">
                <AddressField name="firstName" label={t('account.firstName')} />
                <AddressField name="lastName" label={t('account.lastName')} />
              </div>

              <AddressField name="phone" label={t('account.phone')} />
              <AddressField name="street" label={t('account.street')} />

              <div className="grid grid-cols-2 gap-4">
                <AddressField name="city" label={t('account.city')} />
                <AddressField name="state" label={t('account.state')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <AddressField name="country" label={t('account.country')} />
                <AddressField name="zipCode" label={t('account.zipCode')} />
              </div>

              <Button type="submit" fullWidth loading={creating || updating} className="mt-4">
                {t('common.save')}
              </Button>
            </Form>
          </Formik>
        )}
      </Modal>
    </section>
  );
}

function AddressField({ name, label }: { name: string; label: string }) {
  return (
    <Field name={name}>
      {({ field, meta }: FieldProps) => (
        <Input {...field} label={label} error={meta.touched ? meta.error : undefined} required />
      )}
    </Field>
  );
}

export function OrdersPage() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(0);
  const { data, isLoading } = useGetMyOrdersQuery({ pageIndex: page, pageSize: 10 });

  if (isLoading) return <Spinner />;

  const orders = data?.items ?? [];

  return (
    <section>
      <h2 className="text-title">{t('account.orders')}</h2>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title={t('account.noOrders')}
          description="İlk siparişinizi vermek için koleksiyonu keşfedin."
          action={<Button to="/urunler">{t('cart.continueShopping')}</Button>}
        />
      ) : (
        <>
          <ul className="mt-6 space-y-4">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/hesabim/siparisler/${order.id}`}
                  className="flex flex-wrap items-center gap-5 border border-ink-100 bg-white p-5 transition-colors hover:border-ink-300"
                >
                  {order.firstItemImage && (
                    <img
                      src={mediaUrl(order.firstItemImage) ?? PRODUCT_PLACEHOLDER}
                      alt=""
                      loading="lazy"
                      className="h-20 w-16 shrink-0 object-cover"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="label-caps text-ink-400">{t('order.orderNumber')}</p>
                    <p className="font-medium text-ink-900">{order.orderNumber}</p>
                    <p className="mt-1 text-sm text-ink-500">
                      {formatDate(order.date, localeFor(i18n.language))} · {order.itemCount} ürün
                    </p>
                  </div>

                  <OrderStatusPill statusId={order.statusId} status={order.status} />

                  <Price value={order.total} size="lg" />
                </Link>
              </li>
            ))}
          </ul>

          {data && data.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={!data.hasPrevious} onClick={() => setPage((p) => p - 1)}>
                {t('common.previous')}
              </Button>
              <span className="text-sm text-ink-500">
                {data.pageIndex + 1} / {data.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={!data.hasNext} onClick={() => setPage((p) => p + 1)}>
                {t('common.next')}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();

  const { data: order, isLoading } = useGetOrderByIdQuery(id, { skip: !id });
  const [cancelOrder, { isLoading: cancelling }] = useCancelOrderMutation();

  if (isLoading) return <Spinner />;

  if (!order) {
    return <EmptyState title="Sipariş bulunamadı" action={<Button to="/hesabim/siparisler">{t('common.back')}</Button>} />;
  }

  const cancellable = order.statusId !== 5 && order.statusId !== 6;

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-title">{order.ordernumber}</h2>
          <p className="mt-1 text-sm text-ink-500">
            {formatDate(order.date, localeFor(i18n.language), {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        <OrderStatusPill statusId={order.statusId} status={order.status} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <ul className="divide-y divide-ink-100 border-y border-ink-100">
          {order.orderitems.map((item, index) => (
            <li key={`${item.productId}-${item.variantId ?? index}`} className="flex gap-4 py-4">
              <img
                src={mediaUrl(item.pictureurl) ?? PRODUCT_PLACEHOLDER}
                alt=""
                loading="lazy"
                className="h-20 w-16 shrink-0 object-cover"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-ink-900">{item.productname}</p>
                {item.variantLabel && <p className="text-xs text-ink-400">{item.variantLabel}</p>}
                <p className="mt-1 text-xs text-ink-500">
                  {item.units} × <Price value={item.unitprice} size="sm" />
                </p>
              </div>
              <Price value={item.lineTotal} />
            </li>
          ))}
        </ul>

        <aside className="space-y-6">
          <div className="border border-ink-100 bg-white p-5">
            <h3 className="label-caps text-ink-900">{t('order.address')}</h3>
            <p className="mt-3 text-sm text-ink-600">
              {order.street}
              <br />
              {order.state} / {order.city} {order.zipcode}
              <br />
              {order.country}
            </p>
          </div>

          <div className="border border-ink-100 bg-white p-5">
            <h3 className="label-caps text-ink-900">{t('checkout.summary')}</h3>

            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('cart.subtotal')}</dt>
                <dd>
                  <Price value={order.subtotal} size="sm" />
                </dd>
              </div>

              {order.discountAmount > 0 && (
                <div className="flex justify-between text-moss-500">
                  <dt>{order.couponCode ?? t('cart.discount')}</dt>
                  <dd>
                    -<Price value={order.discountAmount} size="sm" />
                  </dd>
                </div>
              )}

              <div className="flex justify-between border-t border-ink-100 pt-2">
                <dt className="label-caps text-ink-900">{t('cart.total')}</dt>
                <dd>
                  <Price value={order.total} />
                </dd>
              </div>
            </dl>
          </div>

          {cancellable && (
            <Button
              variant="outline"
              fullWidth
              loading={cancelling}
              onClick={async () => {
                try {
                  await cancelOrder({ id: order.id, reason: 'Müşteri talebi' }).unwrap();
                  toast('Siparişiniz iptal edildi', 'success');
                  navigate('/hesabim/siparisler');
                } catch {
                  toast('Sipariş iptal edilemedi', 'error');
                }
              }}
            >
              {t('account.cancelOrder')}
            </Button>
          )}
        </aside>
      </div>
    </section>
  );
}

export function WishlistPage() {
  const { t } = useTranslation();
  const { productIds, isLoading } = useWishlist();

  const { data: products = [], isFetching } = useGetProductsByIdsQuery(productIds, {
    skip: productIds.length === 0,
  });

  if (isLoading) return <Spinner />;

  return (
    <section>
      <h2 className="text-title">{t('account.wishlist')}</h2>

      <div className="mt-6">
        <ProductGrid
          products={products}
          loading={isFetching}
          columns={3}
          emptyTitle={t('account.noWishlist')}
          emptyDescription="Beğendiğiniz ürünleri kalp simgesiyle kaydedin."
          emptyAction={<Button to="/urunler">{t('cart.continueShopping')}</Button>}
        />
      </div>
    </section>
  );
}

/** Colour-coded status chip shared by the order list and detail views. */
function OrderStatusPill({ statusId, status }: { statusId: number; status: string }) {
  const styles: Record<number, string> = {
    1: 'bg-ink-100 text-ink-700',
    2: 'bg-tan-100 text-tan-700',
    3: 'bg-tan-200 text-tan-800',
    4: 'bg-moss-500/15 text-moss-600',
    5: 'bg-moss-500 text-white',
    6: 'bg-wine-500/15 text-wine-600',
  };

  return (
    <span className={cn('label-caps px-3 py-1.5', styles[statusId] ?? 'bg-ink-100 text-ink-700')}>
      {status}
    </span>
  );
}
