import {
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Rating as MuiRating,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { Check, KeyRound, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatDate,
  isNormalizedApiError,
  localeFor,
  PERMISSIONS,
  VELORA_ROLES,
  type AdminUserListItem,
  type Review,
} from '@velora/shared';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/Feedback';
import { StatCard } from '@/components/ui/StatCard';
import { useConfirm } from '@/hooks/useConfirm';
import { DEFAULT_PAGE_SIZE } from '@/config/env';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import {
  useDeleteReviewMutation,
  useGetAdminReviewsQuery,
  useSetReviewApprovalMutation,
} from '@/store/api/catalogAdminApi';
import {
  useDeleteUserMutation,
  useGetAdminUsersQuery,
  useGetRolesQuery,
  useGetUserStatsQuery,
  useResetUserPasswordMutation,
  useSetUserRolesMutation,
  useSetUserStatusMutation,
} from '@/store/api/operationsApi';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser, selectHasPermission } from '@/store/slices/authSlice';

export function CustomersPage() {
  const { t, i18n } = useTranslation();
  const locale = localeFor(i18n.language);
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const currentUser = useAppSelector(selectAuthUser);
  const canWrite = useAppSelector(selectHasPermission(PERMISSIONS.UsersWrite));

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [roleFilter, setRoleFilter] = useState('');
  const [pagination, setPagination] = useState<GridPaginationModel>({
    page: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const { data: stats } = useGetUserStatsQuery();
  const { data: roles = [] } = useGetRolesQuery();
  const { data, isFetching, isError, refetch } = useGetAdminUsersQuery({
    search: debouncedSearch || undefined,
    role: roleFilter || undefined,
    pageIndex: pagination.page,
    pageSize: pagination.pageSize,
  });

  const [setUserStatus] = useSetUserStatusMutation();
  const [setUserRoles, { isLoading: savingRoles }] = useSetUserRolesMutation();
  const [resetPassword, { isLoading: resetting }] = useResetUserPasswordMutation();
  const [deleteUser] = useDeleteUserMutation();

  const [roleEditor, setRoleEditor] = useState<{ user: AdminUserListItem; roles: string[] } | null>(null);
  const [passwordEditor, setPasswordEditor] = useState<{ user: AdminUserListItem; password: string } | null>(
    null,
  );

  const columns = useMemo<GridColDef<AdminUserListItem>[]>(
    () => [
      {
        field: 'fullName',
        headerName: 'Müşteri',
        flex: 1,
        minWidth: 220,
        renderCell: (params) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-900">{params.row.fullName}</p>
            <p className="truncate text-xs text-ink-400">{params.row.email}</p>
          </div>
        ),
      },
      {
        field: 'roles',
        headerName: 'Roller',
        width: 190,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5}>
            {params.row.roles.map((role) => (
              <Chip
                key={role}
                size="small"
                label={role}
                color={role === VELORA_ROLES.Admin ? 'secondary' : 'default'}
                variant={role === VELORA_ROLES.Customer ? 'outlined' : 'filled'}
              />
            ))}
          </Stack>
        ),
      },
      {
        field: 'createdAtUtc',
        headerName: 'Kayıt',
        width: 130,
        renderCell: (params) => (
          <span className="text-sm text-ink-600">{formatDate(params.row.createdAtUtc, locale)}</span>
        ),
      },
      {
        field: 'lastLoginAtUtc',
        headerName: 'Son giriş',
        width: 130,
        renderCell: (params) => (
          <span className="text-sm text-ink-500">
            {params.row.lastLoginAtUtc ? formatDate(params.row.lastLoginAtUtc, locale) : '—'}
          </span>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Durum',
        width: 110,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.isActive ? 'Aktif' : 'Pasif'}
            color={params.row.isActive ? 'success' : 'default'}
            variant={params.row.isActive ? 'filled' : 'outlined'}
          />
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 160,
        sortable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => {
          if (!canWrite) return null;

          const isSelf = params.row.id === currentUser?.id;

          return (
            <Stack direction="row">
              <Tooltip title="Rolleri düzenle">
                <IconButton
                  size="small"
                  onClick={() => setRoleEditor({ user: params.row, roles: [...params.row.roles] })}
                >
                  <ShieldCheck size={15} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Şifre sıfırla">
                <IconButton size="small" onClick={() => setPasswordEditor({ user: params.row, password: '' })}>
                  <KeyRound size={15} />
                </IconButton>
              </Tooltip>

              <Tooltip title={params.row.isActive ? 'Pasife al' : 'Aktifleştir'}>
                <span>
                  <IconButton
                    size="small"
                    disabled={isSelf}
                    onClick={() =>
                      confirm({
                        title: params.row.isActive ? 'Hesabı pasife al' : 'Hesabı aktifleştir',
                        message: `${params.row.fullName} hesabı ${params.row.isActive ? 'pasife alınacak' : 'aktifleştirilecek'}.`,
                        confirmLabel: t('common.confirm'),
                        destructive: params.row.isActive,
                        onConfirm: async () => {
                          try {
                            await setUserStatus({ id: params.row.id, isActive: !params.row.isActive }).unwrap();
                            toast(t('admin.saved'), 'success');
                          } catch (error) {
                            toast(
                              isNormalizedApiError(error) ? error.message : 'Durum değiştirilemedi',
                              'error',
                            );
                          }
                        },
                      })
                    }
                  >
                    {params.row.isActive ? <X size={15} /> : <Check size={15} />}
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title={t('common.delete')}>
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={isSelf}
                    onClick={() =>
                      confirm({
                        title: t('common.delete'),
                        message: t('admin.deleteConfirm', { name: params.row.fullName }),
                        destructive: true,
                        confirmLabel: t('common.delete'),
                        onConfirm: async () => {
                          try {
                            await deleteUser(params.row.id).unwrap();
                            toast(t('admin.deleted'), 'success');
                          } catch (error) {
                            toast(isNormalizedApiError(error) ? error.message : 'Silinemedi', 'error');
                          }
                        },
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    [canWrite, confirm, currentUser?.id, deleteUser, locale, setUserStatus, t, toast],
  );

  return (
    <>
      <PageHeader title={t('admin.customers')} description="Kayıtlı hesaplar, roller ve erişim durumu" />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Toplam kullanıcı" value={String(stats?.totalUsers ?? '—')} />
        <StatCard label="Aktif" value={String(stats?.activeUsers ?? '—')} accent="success" />
        <StatCard label="Son 30 gün" value={String(stats?.newUsersLast30Days ?? '—')} />
        <StatCard label="Yönetici" value={String(stats?.adminUsers ?? '—')} accent="warning" />
      </div>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Ad, soyad veya e-posta ara"
          sx={{ minWidth: { md: 320 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          select
          label="Rol"
          value={roleFilter}
          onChange={(event) => {
            setRoleFilter(event.target.value);
            setPagination((current) => ({ ...current, page: 0 }));
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          {roles.map((role) => (
            <MenuItem key={role.id} value={role.name}>
              {role.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <DataGrid
          rows={data?.items ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          rowHeight={58}
          loading={isFetching}
          disableColumnMenu
          disableRowSelectionOnClick
          paginationMode="server"
          rowCount={data?.totalCount ?? 0}
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[10, 20, 50]}
          sx={{ minHeight: 420 }}
        />
      )}

      <Dialog open={roleEditor !== null} onClose={() => setRoleEditor(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Rolleri düzenle</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {roleEditor?.user.fullName}
          </Typography>

          <Stack>
            {roles.map((role) => (
              <FormControlLabel
                key={role.id}
                control={
                  <Switch
                    checked={roleEditor?.roles.includes(role.name) ?? false}
                    onChange={(event) =>
                      setRoleEditor((current) =>
                        current
                          ? {
                              ...current,
                              roles: event.target.checked
                                ? [...current.roles, role.name]
                                : current.roles.filter((name) => name !== role.name),
                            }
                          : current,
                      )
                    }
                  />
                }
                label={
                  <span>
                    {role.name}
                    <Typography variant="caption" color="text.secondary" display="block">
                      {role.description}
                    </Typography>
                  </span>
                }
              />
            ))}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setRoleEditor(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={savingRoles || (roleEditor?.roles.length ?? 0) === 0}
            onClick={async () => {
              if (!roleEditor) return;

              try {
                await setUserRoles({ id: roleEditor.user.id, roles: roleEditor.roles }).unwrap();
                toast(t('admin.saved'), 'success');
                setRoleEditor(null);
              } catch (error) {
                toast(isNormalizedApiError(error) ? error.message : 'Roller güncellenemedi', 'error');
              }
            }}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={passwordEditor !== null} onClose={() => setPasswordEditor(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Şifre sıfırla</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {passwordEditor?.user.email} için yeni şifre belirleyin. Mevcut tüm oturumları kapatır.
          </Typography>

          <TextField
            type="text"
            label="Yeni şifre"
            value={passwordEditor?.password ?? ''}
            onChange={(event) =>
              setPasswordEditor((current) => (current ? { ...current, password: event.target.value } : current))
            }
            fullWidth
            autoFocus
            helperText="En az 8 karakter"
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setPasswordEditor(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={resetting || (passwordEditor?.password.length ?? 0) < 8}
            onClick={async () => {
              if (!passwordEditor) return;

              try {
                await resetPassword({
                  id: passwordEditor.user.id,
                  newPassword: passwordEditor.password,
                }).unwrap();

                toast('Şifre sıfırlandı', 'success');
                setPasswordEditor(null);
              } catch (error) {
                toast(isNormalizedApiError(error) ? error.message : 'Şifre sıfırlanamadı', 'error');
              }
            }}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {dialog}
    </>
  );
}

export function ReviewsPage() {
  const { t, i18n } = useTranslation();
  const locale = localeFor(i18n.language);
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [approvedFilter, setApprovedFilter] = useState<'' | 'true' | 'false'>('');
  const [pagination, setPagination] = useState<GridPaginationModel>({
    page: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const { data, isFetching, isError, refetch } = useGetAdminReviewsQuery({
    approved: approvedFilter === '' ? undefined : approvedFilter === 'true',
    pageIndex: pagination.page,
    pageSize: pagination.pageSize,
  });

  const [setApproval] = useSetReviewApprovalMutation();
  const [deleteReview] = useDeleteReviewMutation();

  const columns = useMemo<GridColDef<Review>[]>(
    () => [
      {
        field: 'productName',
        headerName: 'Ürün',
        width: 200,
        renderCell: (params) => (
          <span className="truncate text-sm text-ink-900">{params.row.productName ?? '—'}</span>
        ),
      },
      {
        field: 'rating',
        headerName: 'Puan',
        width: 140,
        renderCell: (params) => <MuiRating value={params.row.rating} readOnly size="small" />,
      },
      {
        field: 'comment',
        headerName: 'Yorum',
        flex: 1,
        minWidth: 260,
        sortable: false,
        renderCell: (params) => (
          <div className="min-w-0 py-1">
            {params.row.title && (
              <p className="truncate text-sm font-medium text-ink-900">{params.row.title}</p>
            )}
            <p className="truncate text-xs text-ink-500">{params.row.comment}</p>
          </div>
        ),
      },
      {
        field: 'userName',
        headerName: 'Yazan',
        width: 150,
        renderCell: (params) => <span className="truncate text-sm text-ink-600">{params.row.userName}</span>,
      },
      {
        field: 'createdAtUtc',
        headerName: 'Tarih',
        width: 120,
        renderCell: (params) => (
          <span className="text-sm text-ink-500">{formatDate(params.row.createdAtUtc, locale)}</span>
        ),
      },
      {
        field: 'isApproved',
        headerName: 'Durum',
        width: 120,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.isApproved ? 'Yayında' : 'Beklemede'}
            color={params.row.isApproved ? 'success' : 'warning'}
            variant={params.row.isApproved ? 'filled' : 'outlined'}
          />
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 110,
        sortable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => (
          <Stack direction="row">
            <Tooltip title={params.row.isApproved ? 'Yayından kaldır' : 'Yayınla'}>
              <IconButton
                size="small"
                onClick={async () => {
                  try {
                    await setApproval({ id: params.row.id, isApproved: !params.row.isApproved }).unwrap();
                    toast(t('admin.saved'), 'success');
                  } catch {
                    toast('Değerlendirme güncellenemedi', 'error');
                  }
                }}
              >
                {params.row.isApproved ? <X size={15} /> : <Check size={15} />}
              </IconButton>
            </Tooltip>

            <IconButton
              size="small"
              color="error"
              onClick={() =>
                confirm({
                  title: t('common.delete'),
                  message: 'Bu değerlendirme kalıcı olarak silinecek.',
                  destructive: true,
                  confirmLabel: t('common.delete'),
                  onConfirm: async () => {
                    try {
                      await deleteReview(params.row.id).unwrap();
                      toast(t('admin.deleted'), 'success');
                    } catch {
                      toast('Silinemedi', 'error');
                    }
                  },
                })
              }
            >
              <Trash2 size={15} />
            </IconButton>
          </Stack>
        ),
      },
    ],
    [confirm, deleteReview, locale, setApproval, t, toast],
  );

  return (
    <>
      <PageHeader title={t('admin.reviews')} description="Müşteri değerlendirmelerini yönetin" />

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          label="Durum"
          value={approvedFilter}
          onChange={(event) => {
            setApprovedFilter(event.target.value as '' | 'true' | 'false');
            setPagination((current) => ({ ...current, page: 0 }));
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          <MenuItem value="true">Yayında</MenuItem>
          <MenuItem value="false">Beklemede</MenuItem>
        </TextField>
      </Stack>

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <Card>
          <DataGrid
            rows={data?.items ?? []}
            columns={columns}
            getRowId={(row) => row.id}
            rowHeight={62}
            loading={isFetching}
            disableColumnMenu
            disableRowSelectionOnClick
            paginationMode="server"
            rowCount={data?.totalCount ?? 0}
            paginationModel={pagination}
            onPaginationModelChange={setPagination}
            pageSizeOptions={[10, 20, 50]}
            sx={{ minHeight: 420, border: 0 }}
          />
        </Card>
      )}

      {dialog}
    </>
  );
}
