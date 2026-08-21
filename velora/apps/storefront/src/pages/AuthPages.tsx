import { Formik, Form, Field, type FieldProps } from 'formik';
import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  loginSchema,
  registerSchema,
  zodValidator,
  type LoginFormValues,
  type RegisterFormValues,
} from '@velora/shared';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input } from '@/components/ui/Input';
import { Seo } from '@/components/seo/Seo';
import { useAuth } from '@/hooks';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearAuthError, login, register, selectAuthError, selectAuthStatus } from '@/store/slices/authSlice';

/** Shared split layout: editorial image on the left, form on the right. */
function AuthShell({
  title,
  subtitle,
  imageSeed,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  imageSeed: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid min-h-[calc(100dvh-var(--velora-header-height))] lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img
          src={`https://picsum.photos/seed/velora-${imageSeed}/1200/1600`}
          alt=""
          aria-hidden
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-ink-950/25" />
        <div className="absolute bottom-12 left-12 max-w-sm text-sand-50">
          <p className="font-display text-3xl">Velora</p>
          <p className="mt-3 text-sm text-sand-100/80">
            {t('auth.heroTagline')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-16 sm:px-10">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-headline">{title}</h1>
          <p className="mt-2 text-sm text-ink-500">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-8 text-center text-sm text-ink-500">{footer}</div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { isAuthenticated } = useAuth();
  const status = useAppSelector(selectAuthStatus);
  const error = useAppSelector(selectAuthError);

  const redirect = searchParams.get('redirect') ?? '/hesabim';

  useEffect(() => {
    if (isAuthenticated) navigate(redirect, { replace: true });
  }, [isAuthenticated, navigate, redirect]);

  useEffect(() => () => void dispatch(clearAuthError()), [dispatch]);

  return (
    <>
      <Seo title={t('auth.loginTitle')} description={t('auth.loginMetaDescription')} path="/giris" noindex />

      <AuthShell
        title={t('auth.loginTitle')}
        subtitle={t('auth.loginSubtitle')}
        imageSeed="login"
        footer={
          <>
            {t('auth.noAccount')}{' '}
            <Link to="/kayit" className="font-medium text-ink-900 underline underline-offset-4">
              {t('nav.register')}
            </Link>
          </>
        }
      >
        <Formik<LoginFormValues>
          initialValues={{ userName: '', password: '' }}
          validate={zodValidator<LoginFormValues>(loginSchema)}
          onSubmit={async (values) => {
            await dispatch(login(values));
          }}
        >
          <Form className="space-y-4" noValidate>
            <Field name="userName">
              {({ field, meta }: FieldProps) => (
                <Input
                  {...field}
                  type="email"
                  label={t('auth.email')}
                  autoComplete="email"
                  placeholder="ornek@velora.com"
                  error={meta.touched ? meta.error : undefined}
                  required
                />
              )}
            </Field>

            <Field name="password">
              {({ field, meta }: FieldProps) => (
                <Input
                  {...field}
                  type="password"
                  label={t('auth.password')}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  error={meta.touched ? meta.error : undefined}
                  required
                />
              )}
            </Field>

            {error && (
              <p role="alert" className="border-l-2 border-wine-500 bg-wine-500/5 px-3 py-2 text-sm text-wine-600">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth size="lg" loading={status === 'loading'}>
              {t('auth.loginCta')}
            </Button>
          </Form>
        </Formik>
      </AuthShell>
    </>
  );
}

export function RegisterPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();
  const status = useAppSelector(selectAuthStatus);
  const error = useAppSelector(selectAuthError);

  useEffect(() => {
    if (isAuthenticated) navigate('/hesabim', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => () => void dispatch(clearAuthError()), [dispatch]);

  return (
    <>
      <Seo title={t('auth.registerTitle')} description={t('auth.registerMetaDescription')} path="/kayit" noindex />

      <AuthShell
        title={t('auth.registerTitle')}
        subtitle={t('auth.registerSubtitle')}
        imageSeed="register"
        footer={
          <>
            {t('auth.hasAccount')}{' '}
            <Link to="/giris" className="font-medium text-ink-900 underline underline-offset-4">
              {t('nav.login')}
            </Link>
          </>
        }
      >
        <Formik<RegisterFormValues>
          initialValues={{
            firstName: '',
            lastName: '',
            email: '',
            phoneNumber: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false as unknown as true,
          }}
          validate={zodValidator<RegisterFormValues>(registerSchema)}
          onSubmit={async (values) => {
            await dispatch(
              register({
                email: values.email,
                password: values.password,
                firstName: values.firstName,
                lastName: values.lastName,
                phoneNumber: values.phoneNumber || null,
              }),
            );
          }}
        >
          <Form className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <Field name="firstName">
                {({ field, meta }: FieldProps) => (
                  <Input {...field} label={t('auth.firstName')} autoComplete="given-name" error={meta.touched ? meta.error : undefined} required />
                )}
              </Field>

              <Field name="lastName">
                {({ field, meta }: FieldProps) => (
                  <Input {...field} label={t('auth.lastName')} autoComplete="family-name" error={meta.touched ? meta.error : undefined} required />
                )}
              </Field>
            </div>

            <Field name="email">
              {({ field, meta }: FieldProps) => (
                <Input
                  {...field}
                  type="email"
                  label={t('auth.email')}
                  autoComplete="email"
                  error={meta.touched ? meta.error : undefined}
                  required
                />
              )}
            </Field>

            <Field name="phoneNumber">
              {({ field, meta }: FieldProps) => (
                <Input
                  {...field}
                  type="tel"
                  label={t('auth.phone')}
                  autoComplete="tel"
                  placeholder="0555 555 55 55"
                  error={meta.touched ? meta.error : undefined}
                />
              )}
            </Field>

            <Field name="password">
              {({ field, meta }: FieldProps) => (
                <Input
                  {...field}
                  type="password"
                  label={t('auth.password')}
                  autoComplete="new-password"
                  hint={t('auth.passwordHint')}
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
                  label={t('auth.confirmPassword')}
                  autoComplete="new-password"
                  error={meta.touched ? meta.error : undefined}
                  required
                />
              )}
            </Field>

            <Field name="acceptTerms" type="checkbox">
              {({ field, meta }: FieldProps) => (
                <Checkbox
                  {...field}
                  checked={Boolean(field.value)}
                  label={t('auth.acceptTerms')}
                  error={meta.touched ? meta.error : undefined}
                />
              )}
            </Field>

            {error && (
              <p role="alert" className="border-l-2 border-wine-500 bg-wine-500/5 px-3 py-2 text-sm text-wine-600">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth size="lg" loading={status === 'loading'}>
              {t('auth.registerCta')}
            </Button>
          </Form>
        </Formik>
      </AuthShell>
    </>
  );
}
