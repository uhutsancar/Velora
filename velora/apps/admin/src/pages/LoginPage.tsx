import { Alert, Button, Card, CardContent, TextField, Typography } from '@mui/material';
import { Formik, Form, Field, type FieldProps } from 'formik';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loginSchema, zodValidator, type LoginFormValues } from '@velora/shared';
import { env } from '@/config/env';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  clearAuthError,
  login,
  selectAuthError,
  selectAuthStatus,
  selectIsAuthenticated,
} from '@/store/slices/authSlice';

export default function LoginPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const status = useAppSelector(selectAuthStatus);
  const error = useAppSelector(selectAuthError);

  const redirect = searchParams.get('redirect') ?? '/';

  useEffect(() => {
    if (isAuthenticated) navigate(redirect, { replace: true });
  }, [isAuthenticated, navigate, redirect]);

  useEffect(() => () => void dispatch(clearAuthError()), [dispatch]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl tracking-[0.28em] text-sand-50 text-white">VELORA</p>
          <p className="label-caps mt-2 text-tan-300">{env.appName}</p>
        </div>

        <Card sx={{ borderRadius: 1 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" sx={{ mb: 0.5 }}>
              {t('auth.loginTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('admin.loginSubtitle')}
            </Typography>

            <Formik<LoginFormValues>
              initialValues={{ userName: '', password: '' }}
              validate={zodValidator<LoginFormValues>(loginSchema)}
              onSubmit={async (values) => {
                await dispatch(login(values));
              }}
            >
              <Form noValidate>
                <Field name="userName">
                  {({ field, meta }: FieldProps) => (
                    <TextField
                      {...field}
                      type="email"
                      label={t('auth.email')}
                      autoComplete="username"
                      fullWidth
                      margin="normal"
                      error={Boolean(meta.touched && meta.error)}
                      helperText={meta.touched ? meta.error : ' '}
                    />
                  )}
                </Field>

                <Field name="password">
                  {({ field, meta }: FieldProps) => (
                    <TextField
                      {...field}
                      type="password"
                      label={t('auth.password')}
                      autoComplete="current-password"
                      fullWidth
                      margin="normal"
                      error={Boolean(meta.touched && meta.error)}
                      helperText={meta.touched ? meta.error : ' '}
                    />
                  )}
                </Field>

                {error && (
                  <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={status === 'loading'}
                  sx={{ mt: 2 }}
                >
                  {status === 'loading' ? t('common.loading') : t('auth.loginCta')}
                </Button>
              </Form>
            </Formik>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-sand-100/50">
          {t('admin.loginRolesNote')}
        </p>
      </div>
    </div>
  );
}
