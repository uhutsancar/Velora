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
      <PageHeader title={t('admin.settings')} description="Sistem yapılandırması ve yetki matrisi" />

      <Stack spacing={3}>
        <Card>
          <CardHeader title="Oturum" titleTypographyProps={{ variant: 'h5' }} />
          <CardContent>
            <Stack spacing={1.5}>
              <Row label="Kullanıcı" value={user?.fullName ?? '—'} />
              <Row label="E-posta" value={user?.email ?? '—'} />
              <Row
                label="Roller"
                value={
                  <Stack direction="row" spacing={0.5}>
                    {user?.roles.map((role) => (
                      <Chip key={role} size="small" label={role} color="secondary" />
                    ))}
                  </Stack>
                }
              />
              <Row label="İzin sayısı" value={String(user?.permissions.length ?? 0)} />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Servis uçları"
            subheader="Derleme sırasında ortam değişkenlerinden okunur"
            titleTypographyProps={{ variant: 'h5' }}
          />
          <CardContent>
            <Stack spacing={1.5}>
              <Row label="API Gateway" value={env.apiUrl} mono />
              <Row label="Medya kaynağı" value={env.mediaOrigin} mono />
              <Row label="Mağaza" value={env.storefrontUrl} mono />
              <Row label="Para birimi" value={env.currency} />
            </Stack>

            <Alert severity="info" sx={{ mt: 2.5 }}>
              Bu değerler <code>.env</code> dosyasından gelir. Değiştirmek için dağıtım
              yapılandırmasını güncelleyip uygulamayı yeniden derleyin.
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Rol / izin matrisi"
            subheader="IdentityService tarafından tohumlanır; API her istekte bu izinleri doğrular"
            titleTypographyProps={{ variant: 'h5' }}
          />
          <CardContent>
            <Stack spacing={2.5} divider={<Divider />}>
              {roles.map((role) => (
                <div key={role.id}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle2">{role.name}</Typography>
                    {role.isSystemRole && <Chip size="small" label="Sistem" variant="outlined" />}
                  </Stack>

                  {role.description && (
                    <Typography variant="caption" color="text.secondary">
                      {role.description}
                    </Typography>
                  )}

                  <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                    {role.permissions.length === 0 ? (
                      <Typography variant="caption" color="text.disabled">
                        İzin tanımlı değil
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
            title="Tanımlı izinler"
            subheader={`${permissions.length} izin`}
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
