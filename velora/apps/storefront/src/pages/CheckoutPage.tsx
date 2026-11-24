import { Formik, Form, Field, type FieldProps } from 'formik';
import { CreditCard, Lock, MapPin, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  addressSchema,
  paymentSchema,
  zodValidator,
  type AddressFormValues,
  type PaymentFormValues,
} from '@velora/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Price } from '@/components/ui/Display';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Overlay';
import { Seo } from '@/components/seo/Seo';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/config/env';
import { useAuth, useToast } from '@/hooks';
import { useCreateAddressMutation, useGetAddressesQuery } from '@/store/api/accountApi';
import { useCheckoutMutation, useGetBasketQuery } from '@/store/api/basketApi';
import { mediaUrl, PRODUCT_PLACEHOLDER } from '@/utils/media';
import { cn } from '@/utils/cn';

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

export default function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuth();

  const { data: basket, isLoading: basketLoading } = useGetBasketQuery(undefined, {
    skip: !isAuthenticated,
  });
  const { data: addresses = [], isLoading: addressesLoading } = useGetAddressesQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [createAddress, { isLoading: creatingAddress }] = useCreateAddressMutation();
  const [checkout, { isLoading: submitting }] = useCheckoutMutation();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  // Preselect the default address so the happy path is one click shorter.
  useEffect(() => {
    if (selectedAddressId || addresses.length === 0) return;

    const preferred = addresses.find((address) => address.isDefault) ?? addresses[0];
    if (preferred) setSelectedAddressId(preferred.id);
  }, [addresses, selectedAddressId]);

  const items = basket?.items ?? [];
  const subtotal = basket?.subtotal ?? 0;
  const discount = basket?.discountAmount ?? 0;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE;
  const total = Math.max(0, subtotal - discount) + shipping;

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );

  useEffect(() => {
    if (!isAuthenticated) navigate('/giris?redirect=/odeme', { replace: true });
  }, [isAuthenticated, navigate]);

  const submitOrder = async (values: PaymentFormValues) => {
    if (!selectedAddress) {
      toast(t('checkout.selectAddress'), 'error');
      return;
    }

    try {
      const requestId = sessionStorage.getItem('velora-checkout-request-id') ?? crypto.randomUUID();
      sessionStorage.setItem('velora-checkout-request-id', requestId);

      await checkout({
        city: selectedAddress.city,
        street: selectedAddress.street,
        state: selectedAddress.state,
        country: selectedAddress.country,
        zipCode: selectedAddress.zipCode,
        paymentMethodToken: values.paymentMethodToken,
        paymentProvider: values.paymentProvider,
        requestId,
      }).unwrap();

      sessionStorage.removeItem('velora-checkout-request-id');
      navigate('/siparis-alindi', { replace: true });
    } catch (error) {
      toast.error(error, t('checkout.orderFailed'));
    }
  };

  if (basketLoading || addressesLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-velora py-20">
        <EmptyState
          title={t('cart.empty')}
          description={t('cart.emptyBody')}
          action={<Button to="/urunler">{t('cart.continueShopping')}</Button>}
        />
      </div>
    );
  }

  return (
    <div className="container-velora py-10 md:py-16">
      <Seo
        title={t('checkout.title')}
        description={t('checkout.metaDescription')}
        path="/odeme"
        noindex
      />

      <h1 className="text-headline">{t('checkout.title')}</h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-12">
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-title">
                <MapPin className="h-5 w-5 text-tan-600" aria-hidden />
                {t('checkout.address')}
              </h2>

              <Button
                variant="link"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setAddressModalOpen(true)}
              >
                {t('checkout.newAddress')}
              </Button>
            </div>

            {addresses.length === 0 ? (
              <EmptyState
                title={t('account.noAddresses')}
                description={t('checkout.noAddressBody')}
                action={
                  <Button onClick={() => setAddressModalOpen(true)}>
                    {t('checkout.newAddress')}
                  </Button>
                }
              />
            ) : (
              <ul
                className="grid gap-3 sm:grid-cols-2"
                role="radiogroup"
                aria-label={t('checkout.address')}
              >
                {addresses.map((address) => {
                  const selected = address.id === selectedAddressId;

                  return (
                    <li key={address.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setSelectedAddressId(address.id)}
                        className={cn(
                          'w-full border p-5 text-left transition-colors',
                          selected
                            ? 'border-ink-900 bg-white'
                            : 'border-ink-200 hover:border-ink-400',
                        )}
                      >
                        <span className="label-caps block text-ink-900">{address.title}</span>
                        <span className="mt-2 block text-sm text-ink-700">
                          {address.firstName} {address.lastName}
                        </span>
                        <span className="mt-1 block text-sm text-ink-500">
                          {address.street}, {address.state} / {address.city} {address.zipCode}
                        </span>
                        <span className="mt-1 block text-sm text-ink-400">{address.phone}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-5 flex items-center gap-2 text-title">
              <CreditCard className="h-5 w-5 text-tan-600" aria-hidden />
              {t('checkout.payment')}
            </h2>

            <Formik<PaymentFormValues>
              initialValues={{
                paymentMethodToken: import.meta.env.DEV ? 'sandbox_approved_demo' : '',
                paymentProvider: import.meta.env.DEV ? 'sandbox' : '',
              }}
              validate={zodValidator<PaymentFormValues>(paymentSchema)}
              onSubmit={submitOrder}
            >
              {() => (
                <Form className="max-w-xl space-y-4">
                  <Field name="paymentMethodToken">
                    {({ field, meta }: FieldProps) => (
                      <Input
                        {...field}
                        label="Sandbox / sağlayıcı ödeme tokenı"
                        autoComplete="off"
                        placeholder="PSP hosted form tokenı"
                        error={meta.touched ? meta.error : undefined}
                        required
                      />
                    )}
                  </Field>

                  <p className="flex items-center gap-2 text-xs text-ink-400">
                    <Lock className="h-3.5 w-3.5" aria-hidden />
                    {t('checkout.secureNotice')}
                  </p>

                  <Button
                    type="submit"
                    size="lg"
                    fullWidth
                    loading={submitting}
                    disabled={!selectedAddress}
                  >
                    {submitting ? t('checkout.processing') : t('checkout.placeOrder')}
                  </Button>
                </Form>
              )}
            </Formik>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="border border-ink-100 bg-white p-6">
            <h2 className="label-caps text-ink-900">{t('checkout.summary')}</h2>

            <ul className="mt-5 space-y-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <img
                    src={mediaUrl(item.pictureUrl) ?? PRODUCT_PLACEHOLDER}
                    alt=""
                    loading="lazy"
                    className="h-16 w-14 shrink-0 object-cover"
                  />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-ink-900">{item.productName}</p>
                    {item.variantLabel && (
                      <p className="text-xs text-ink-400">{item.variantLabel}</p>
                    )}
                    <p className="text-xs text-ink-400">{item.quantity} adet</p>
                  </div>
                  <Price value={item.unitPrice * item.quantity} size="sm" />
                </li>
              ))}
            </ul>

            <dl className="mt-6 space-y-2.5 border-t border-ink-100 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('cart.subtotal')}</dt>
                <dd>
                  <Price value={subtotal} size="sm" />
                </dd>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-moss-500">
                  <dt>{t('cart.discount')}</dt>
                  <dd>
                    -<Price value={discount} size="sm" />
                  </dd>
                </div>
              )}

              <div className="flex justify-between">
                <dt className="text-ink-500">{t('cart.shipping')}</dt>
                <dd>
                  {shipping === 0 ? (
                    <span className="text-moss-500">{t('cart.freeShipping')}</span>
                  ) : (
                    <Price value={shipping} size="sm" />
                  )}
                </dd>
              </div>

              <div className="flex justify-between border-t border-ink-100 pt-3">
                <dt className="label-caps text-ink-900">{t('cart.total')}</dt>
                <dd>
                  <Price value={total} size="lg" />
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      <Modal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        title={t('checkout.newAddress')}
      >
        <Formik<AddressFormValues>
          initialValues={emptyAddress}
          validate={zodValidator<AddressFormValues>(addressSchema)}
          onSubmit={async (values) => {
            try {
              const created = await createAddress(values).unwrap();
              setSelectedAddressId(created.id);
              setAddressModalOpen(false);
              toast('Adres eklendi', 'success');
            } catch {
              toast('Adres kaydedilemedi', 'error');
            }
          }}
        >
          <Form className="space-y-3">
            <TextField
              name="title"
              label={t('account.addressTitle')}
              placeholder={t('checkout.addressTitlePlaceholder')}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <TextField name="firstName" label={t('account.firstName')} required />
              <TextField name="lastName" label={t('account.lastName')} required />
            </div>

            <TextField
              name="phone"
              label={t('account.phone')}
              placeholder="0555 555 55 55"
              required
            />
            <TextField name="street" label={t('account.street')} required />

            <div className="grid grid-cols-2 gap-4">
              <TextField name="city" label={t('account.city')} required />
              <TextField name="state" label={t('account.state')} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextField name="country" label={t('account.country')} required />
              <TextField name="zipCode" label={t('account.zipCode')} placeholder="34000" required />
            </div>

            <Button type="submit" fullWidth loading={creatingAddress} className="mt-4">
              {t('common.save')}
            </Button>
          </Form>
        </Formik>
      </Modal>
    </div>
  );
}
function TextField({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <Field name={name}>
      {({ field, meta }: FieldProps) => (
        <Input
          {...field}
          label={label}
          placeholder={placeholder}
          required={required}
          error={meta.touched ? meta.error : undefined}
        />
      )}
    </Field>
  );
}
