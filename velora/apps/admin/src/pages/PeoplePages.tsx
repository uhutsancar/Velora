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
  MenuItem,
  Rating as MuiRating,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { Check, KeyRound, ShieldCheck, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatDate,
  localeFor,
  PERMISSIONS,
  VELORA_ROLES,
  type AdminUserListItem,
  type Review,
} from '@velora/shared';
import { FilterBar, FilterSelect, SearchField } from '@/components/ui/Filters';
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
        headerName: t('order.customer'),
        flex: 1,
        minWidth: 220,
        renderCell: (params) => (
          <div className="flex h-full min-w-0 flex-col justify-center">
            <p className="truncate text-sm font-medium text-ink-900">{params.row.fullName}</p>
            <p className="truncate text-xs text-ink-400">{params.row.email}</p>
          </div>
        ),
      },
      {
        field: 'roles',
        headerName: t('admin.roles'),
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
        headerName: t('admin.registered'),
        width: 130,
        renderCell: (params) => (
          <span className="text-sm text-ink-600">{formatDate(params.row.createdAtUtc, locale)}</span>
        ),
      },
      {
        field: 'lastLoginAtUtc',
        headerName: t('admin.lastLogin'),
        width: 130,
        renderCell: (params) => (
          <span className="text-sm text-ink-500">
            {params.row.lastLoginAtUtc ? formatDate(params.row.lastLoginAtUtc, locale) : '—'}
          </span>
        ),
      },
      {
        field: 'isActive',
        headerName: t('order.status'),
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
              <Tooltip title={t('admin.editRoles')}>
                <IconButton
                  size="small"
                  onClick={() => setRoleEditor({ user: params.row, roles: [...params.row.roles] })}
                >
                  <ShieldCheck size={15} />
                </IconButton>
              </Tooltip>

              <Tooltip title={t('admin.resetPassword')}>
                <IconButton size="small" onClick={() => setPasswordEditor({ user: params.row, password: '' })}>
                  <KeyRound size={15} />
                </IconButton>
              </Tooltip>

              <Tooltip title={params.row.isActive ? t('admin.deactivate') : t('admin.activate')}>
                <span>
                  <IconButton
                    size="small"
                    disabled={isSelf}
                    onClick={() =>
                      confirm({
                        title: params.row.isActive ? t('admin.deactivateTitle') : t('admin.activateTitle'),
                        message: params.row.isActive
                          ? t('admin.deactivateMessage', { name: params.row.fullName })
                          : t('admin.activateMessage', { name: params.row.fullName }),
                        confirmLabel: t('common.confirm'),
                        destructive: params.row.isActive,
                        onConfirm: async () => {
                          try {
                            await setUserStatus({ id: params.row.id, isActive: !params.row.isActive }).unwrap();
                            toast.success(t('admin.saved'));
                          } catch (error) {
                            toast.error(error, t('admin.statusChangeFailed'));
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
                            toast.success(t('admin.deleted'));
                          } catch (error) {
                            toast.error(error, 'Silinemedi');
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
      <PageHeader title={t('admin.customers')} description={t('admin.customersSubtitle')} />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('admin.totalUsers')} value={String(stats?.totalUsers ?? '—')} />
        <StatCard label={t('common.active')} value={String(stats?.activeUsers ?? '—')} accent="success" />
        <StatCard label={t('admin.last30Days')} value={String(stats?.newUsersLast30Days ?? '—')} />
        <StatCard label={t('admin.admins')} value={String(stats?.adminUsers ?? '—')} accent="warning" />
      </div>

      <FilterBar>
        <SearchField value={search} onChange={setSearch} placeholder={t('admin.customerSearchPlaceholder')} />

        <FilterSelect
          label={t('admin.role')}
          value={roleFilter}
          onChange={(event) => {
            setRoleFilter(event.target.value);
            setPagination((current) => ({ ...current, page: 0 }));
          }}
          minWidth={180}
          options={[
            { value: '', label: t('common.all') },
            ...roles.map((role) => ({ value: role.name, label: role.name })),
          ]}
        />
      </FilterBar>

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
        <DialogTitle>{t('admin.editRoles')}</DialogTitle>
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
                toast.success(t('admin.saved'));
                setRoleEditor(null);
              } catch (error) {
                toast.error(error, t('admin.rolesUpdateFailed'));
              }
            }}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={passwordEditor !== null} onClose={() => setPasswordEditor(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('admin.resetPassword')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('admin.resetPasswordBody', { email: passwordEditor?.user.email ?? '' })}
          </Typography>

          <TextField
            type="text"
            label={t('admin.newPassword')}
            value={passwordEditor?.password ?? ''}
            onChange={(event) =>
              setPasswordEditor((current) => (current ? { ...current, password: event.target.value } : current))
            }
            fullWidth
            autoFocus
            helperText={t('admin.passwordMinHint')}
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

                toast.success(t('admin.passwordReset'));
                setPasswordEditor(null);
              } catch (error) {
                toast.error(error, t('admin.passwordResetFailed'));
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
        headerName: t('admin.product'),
        width: 200,
        renderCell: (params) => (
          <span className="truncate text-sm text-ink-900">{params.row.productName ?? '—'}</span>
        ),
      },
      {
        field: 'rating',
        headerName: t('admin.rating'),
        width: 140,
        renderCell: (params) => <MuiRating value={params.row.rating} readOnly size="small" />,
      },
      {
        field: 'comment',
        headerName: t('admin.comment'),
        flex: 1,
        minWidth: 260,
        sortable: false,
        renderCell: (params) => (
          <div className="flex h-full min-w-0 flex-col justify-center">
            {params.row.title && (
              <p className="truncate text-sm font-medium text-ink-900">{params.row.title}</p>
            )}
            <p className="truncate text-xs text-ink-500">{params.row.comment}</p>
          </div>
        ),
      },
      {
        field: 'userName',
        headerName: t('admin.author'),
        width: 150,
        renderCell: (params) => <span className="truncate text-sm text-ink-600">{params.row.userName}</span>,
      },
      {
        field: 'createdAtUtc',
        headerName: t('order.date'),
        width: 120,
        renderCell: (params) => (
          <span className="text-sm text-ink-500">{formatDate(params.row.createdAtUtc, locale)}</span>
        ),
      },
      {
        field: 'isApproved',
        headerName: t('order.status'),
        width: 120,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.isApproved ? t('admin.published') : t('admin.pending')}
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
            <Tooltip title={params.row.isApproved ? t('admin.unpublish') : t('admin.publish')}>
              <IconButton
                size="small"
                onClick={async () => {
                  try {
                    await setApproval({ id: params.row.id, isApproved: !params.row.isApproved }).unwrap();
                    toast.success(t('admin.saved'));
                  } catch {
                    toast(t('admin.reviewUpdateFailed'), 'error');
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
                  message: t('admin.reviewDeleteMessage'),
                  destructive: true,
                  confirmLabel: t('common.delete'),
                  onConfirm: async () => {
                    try {
                      await deleteReview(params.row.id).unwrap();
                      toast.success(t('admin.deleted'));
                    } catch {
                      toast(t('admin.deleteFailed'), 'error');
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
      <PageHeader title={t('admin.reviews')} description={t('admin.reviewsSubtitle')} />

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          label={t('order.status')}
          value={approvedFilter}
          onChange={(event) => {
            setApprovedFilter(event.target.value as '' | 'true' | 'false');
            setPagination((current) => ({ ...current, page: 0 }));
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          <MenuItem value="true">{t('admin.published')}</MenuItem>
          <MenuItem value="false">{t('admin.pending')}</MenuItem>
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
