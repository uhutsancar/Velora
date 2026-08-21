import { Alert, Card, CardContent, CardHeader, Chip, Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/PageHeader';
import { env } from '@/config/env';
import { useGetPermissionsQuery, useGetRolesQuery } from '@/store/api/operationsApi';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/slices/authSlice';

/**
 * Read-only system overview.
 *
 * Deliberately not an "edit anything" screen: service endpoints and secrets are
 * deployment configuration, and letting the UI rewrite them would put runtime
 * wiring in the hands of whoever is signed in.
 */
export default function SettingsPage() {
  const { t } = useTranslation();
  const user = useAppSelector(selectAuthUser);

  const { data: roles = [] } = useGetRolesQuery();
  const { data: permissions = [] } = useGetPermissionsQuery();

  return (
    <>
      <PageHeader title={t('admin.settings')} description={t('admin.settingsSubtitle')} />

      <Stack spacing={3}>
        <Card>
          <CardHeader title={t('admin.session')} titleTypographyProps={{ variant: 'h5' }} />
          <CardContent>
            <Stack spacing={1.5}>
              <Row label={t('admin.user')} value={user?.fullName ?? '—'} />
              <Row label={t('account.email')} value={user?.email ?? '—'} />
              <Row
                label={t('admin.roles')}
                value={
                  <Stack direction="row" spacing={0.5}>
                    {user?.roles.map((role) => (
                      <Chip key={role} size="small" label={role} color="secondary" />
                    ))}
                  </Stack>
                }
              />
              <Row label={t('admin.permissionCount')} value={String(user?.permissions.length ?? 0)} />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title={t('admin.serviceEndpoints')}
            subheader={t('admin.serviceEndpointsHint')}
            titleTypographyProps={{ variant: 'h5' }}
          />
          <CardContent>
            <Stack spacing={1.5}>
              <Row label="API Gateway" value={env.apiUrl} mono />
              <Row label={t('admin.mediaOrigin')} value={env.mediaOrigin} mono />
              <Row label={t('admin.storefront')} value={env.storefrontUrl} mono />
              <Row label={t('admin.currency')} value={env.currency} />
            </Stack>

            <Alert severity="info" sx={{ mt: 2.5 }}>
              {t('admin.envNotePrefix')} <code>.env</code> {t('admin.envNoteSuffix')}
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title={t('admin.roleMatrix')}
            subheader={t('admin.roleMatrixHint')}
            titleTypographyProps={{ variant: 'h5' }}
          />
          <CardContent>
            <Stack spacing={2.5} divider={<Divider />}>
              {roles.map((role) => (
                <div key={role.id}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle2">{role.name}</Typography>
                    {role.isSystemRole && <Chip size="small" label={t('admin.systemRole')} variant="outlined" />}
                  </Stack>

                  {role.description && (
                    <Typography variant="caption" color="text.secondary">
                      {role.description}
                    </Typography>
                  )}

                  <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                    {role.permissions.length === 0 ? (
                      <Typography variant="caption" color="text.disabled">
                        {t('admin.noPermission')}
                      </Typography>
                    ) : (
                      role.permissions.map((permission) => (
                        <Chip key={permission} size="small" label={permission} variant="outlined" />
                      ))
                    )}
                  </Stack>
                </div>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title={t('admin.definedPermissions')}
            subheader={t('admin.permissionsCount', { count: permissions.length })}
            titleTypographyProps={{ variant: 'h5' }}
          />
          <CardContent>
            <Stack spacing={1}>
              {permissions.map((permission) => (
                <Stack key={permission.code} direction="row" justifyContent="space-between" spacing={2}>
                  <code className="font-mono text-xs text-ink-700">{permission.code}</code>
                  <Typography variant="caption" color="text.secondary">
                    {permission.description}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>

      {typeof value === 'string' ? (
        <Typography variant="body2" sx={mono ? { fontFamily: 'monospace', fontSize: 13 } : undefined}>
          {value}
        </Typography>
      ) : (
        value
      )}
    </Stack>
  );
}
