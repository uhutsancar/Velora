import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  localeFor,
  ORDER_STATUS,
  PERMISSIONS,
  type OrderSummary,
} from '@velora/shared';
import { ORDER_STATUS_COLORS } from '@/components/charts/chartTheme';
import { FilterBar, FilterSelect, SearchField } from '@/components/ui/Filters';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingScreen } from '@/components/ui/Feedback';
import { useConfirm } from '@/hooks/useConfirm';
import { DEFAULT_PAGE_SIZE, env } from '@/config/env';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import {
  useGetAdminOrderQuery,
  useGetAdminOrdersQuery,
  useGetOrderStatusesQuery,
  useUpdateOrderStatusMutation,
} from '@/store/api/operationsApi';
import { useAppSelector } from '@/store/hooks';
import { selectHasPermission } from '@/store/slices/authSlice';
import { mediaUrl, PRODUCT_PLACEHOLDER } from '@/utils/media';

function StatusChip({ statusId, label }: { statusId: number; label: string }) {
  const color = ORDER_STATUS_COLORS[statusId] ?? '#B0AAA0';

  return (
    <Chip
      size="small"
      label={label}
      sx={{ bgcolor: `${color}1F`, color, fontWeight: 500 }}
    />
  );
}

export function OrdersPage() {
  const { t, i18n } = useTranslation();
  const locale = localeFor(i18n.language);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [statusId, setStatusId] = useState<number | ''>('');
  const [pagination, setPagination] = useState<GridPaginationModel>({
    page: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const { data: statuses = [] } = useGetOrderStatusesQuery();
  const { data, isFetching, isError, refetch } = useGetAdminOrdersQuery({
    search: debouncedSearch || undefined,
    statusId: statusId === '' ? undefined : statusId,
    pageIndex: pagination.page,
    pageSize: pagination.pageSize,
  });

  const columns = useMemo<GridColDef<OrderSummary>[]>(
    () => [
      {
        field: 'orderNumber',
        headerName: t('order.orderNumber'),
        width: 170,
        renderCell: (params) => (
          <Link to={`/orders/${params.row.id}`} className="text-sm font-medium text-ink-900 hover:underline">
            {params.row.orderNumber}
          </Link>
        ),
      },
      {
        field: 'date',
        headerName: t('order.date'),
        width: 150,
        renderCell: (params) => (
          <span className="text-sm text-ink-600">{formatDate(params.row.date, locale)}</span>
        ),
      },
      {
        field: 'userName',
        headerName: t('order.customer'),
        flex: 1,
        minWidth: 180,
        renderCell: (params) => (
          <div className="flex h-full min-w-0 flex-col justify-center">
            <p className="truncate text-sm text-ink-900">{params.row.userName ?? t('admin.guest')}</p>
            <p className="truncate text-xs text-ink-400">
              {params.row.city ?? '—'} {params.row.country ? `/ ${params.row.country}` : ''}
            </p>
          </div>
        ),
      },
      {
        field: 'itemCount',
        headerName: t('order.items'),
        width: 90,
        renderCell: (params) => <span className="text-sm tabular-nums">{params.row.itemCount}</span>,
      },
      {
        field: 'status',
        headerName: t('order.status'),
        width: 150,
        renderCell: (params) => <StatusChip statusId={params.row.statusId} label={params.row.status} />,
      },
      {
        field: 'total',
        headerName: t('order.total'),
        width: 140,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => (
          <span className="text-sm font-medium tabular-nums">
            {formatCurrency(params.row.total, locale, env.currency)}
          </span>
        ),
      },
    ],
    [locale, t],
  );

  return (
    <>
      <PageHeader title={t('admin.orders')} description={t('admin.ordersSubtitle')} />

      <FilterBar>
        <SearchField value={search} onChange={setSearch} placeholder={t('admin.orderSearchPlaceholder')} />

        <FilterSelect
          label={t('order.status')}
          value={statusId}
          onChange={(event) => {
            setStatusId(event.target.value === '' ? '' : Number(event.target.value));
            setPagination((current) => ({ ...current, page: 0 }));
          }}
          minWidth={200}
          options={[
            { value: '', label: t('common.all') },
            ...statuses.map((status) => ({ value: status.id, label: status.name })),
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
          onRowClick={(params) => navigate(`/orders/${params.id}`)}
          paginationMode="server"
          rowCount={data?.totalCount ?? 0}
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[10, 20, 50]}
          sx={{ minHeight: 420, '& .MuiDataGrid-row': { cursor: 'pointer' } }}
        />
      )}
    </>
  );
}

/** Status transitions the back office may perform, matching the aggregate rules. */
const ALLOWED_TRANSITIONS: Record<number, number[]> = {
  [ORDER_STATUS.Submitted]: [ORDER_STATUS.AwaitingValidation, ORDER_STATUS.StockConfirmed, ORDER_STATUS.Cancelled],
  [ORDER_STATUS.AwaitingValidation]: [ORDER_STATUS.StockConfirmed, ORDER_STATUS.Cancelled],
  [ORDER_STATUS.StockConfirmed]: [ORDER_STATUS.Paid, ORDER_STATUS.Shipped, ORDER_STATUS.Cancelled],
  [ORDER_STATUS.Paid]: [ORDER_STATUS.Shipped, ORDER_STATUS.Cancelled],
  [ORDER_STATUS.Shipped]: [],
  [ORDER_STATUS.Cancelled]: [],
};

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const locale = localeFor(i18n.language);
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const canWrite = useAppSelector(selectHasPermission(PERMISSIONS.OrdersWrite));

  const { data: order, isLoading, isError, refetch } = useGetAdminOrderQuery(id, { skip: !id });
  const { data: statuses = [] } = useGetOrderStatusesQuery();
  const [updateStatus, { isLoading: updating }] = useUpdateOrderStatusMutation();

  if (isLoading) return <LoadingScreen />;
  if (isError || !order) return <ErrorState onRetry={() => void refetch()} />;

  const money = (value: number) => formatCurrency(value, locale, env.currency);
  const allowed = ALLOWED_TRANSITIONS[order.statusId] ?? [];

  const changeStatus = (targetId: number) => {
    const target = statuses.find((status) => status.id === targetId);

    confirm({
      title: t('admin.orderStatusTitle'),
      message: t('admin.orderStatusConfirm', {
        order: order.ordernumber,
        status: target?.name ?? targetId,
      }),
      confirmLabel: t('common.confirm'),
      destructive: targetId === ORDER_STATUS.Cancelled,
      onConfirm: async () => {
        try {
          await updateStatus({ id: order.id, statusId: targetId }).unwrap();
          toast.success(t('admin.orderStatusUpdated'));
        } catch (error) {
          toast.error(error, t('admin.statusChangeFailed'));
        }
      },
    });
  };

  return (
    <>
      <PageHeader
        title={order.ordernumber}
        description={formatDateTime(order.date, locale)}
        breadcrumbs={[{ label: t('admin.orders'), to: '/orders' }, { label: order.ordernumber }]}
        actions={
          <Button color="inherit" startIcon={<ArrowLeft size={16} />} onClick={() => navigate('/orders')}>
            {t('common.back')}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title={t('order.items')} />
            <CardContent sx={{ pt: 0 }}>
              <ul className="divide-y divide-ink-100">
                {order.orderitems.map((item, index) => (
                  <li key={`${item.productId}-${item.variantId ?? index}`} className="flex items-center gap-3 py-3">
                    <img
                      src={mediaUrl(item.pictureurl) ?? PRODUCT_PLACEHOLDER}
                      alt=""
                      loading="lazy"
                      className="h-14 w-12 shrink-0 object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{item.productname}</p>
                      {item.variantLabel && <p className="text-xs text-ink-400">{item.variantLabel}</p>}
                      <p className="text-xs text-ink-500">
                        {item.units} × {money(item.unitprice)}
                      </p>
                    </div>

                    <span className="text-sm font-medium tabular-nums">{money(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Ara toplam
                  </Typography>
                  <Typography variant="body2">{money(order.subtotal)}</Typography>
                </Stack>

                {order.discountAmount > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="success.main">
                      {t('admin.discount')} {order.couponCode ? `(${order.couponCode})` : ''}
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      -{money(order.discountAmount)}
                    </Typography>
                  </Stack>
                )}

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">Toplam</Typography>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {money(order.total)}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={t('order.status')} />
            <CardContent>
              <StatusChip statusId={order.statusId} label={order.status} />

              <Stack spacing={0.5} sx={{ mt: 2 }}>
                {order.paidAtUtc && (
                  <Typography variant="caption" color="text.secondary">
                    {t('admin.paidAt')}: {formatDateTime(order.paidAtUtc, locale)}
                  </Typography>
                )}
                {order.shippedAtUtc && (
                  <Typography variant="caption" color="text.secondary">
                    {t('admin.shippedAt')}: {formatDateTime(order.shippedAtUtc, locale)}
                  </Typography>
                )}
                {order.cancelledAtUtc && (
                  <Typography variant="caption" color="error.main">
                    {t('admin.cancelledAt')}: {formatDateTime(order.cancelledAtUtc, locale)}
                    {order.cancelReason ? ` — ${order.cancelReason}` : ''}
                  </Typography>
                )}
              </Stack>

              {canWrite && allowed.length > 0 && (
                <Stack spacing={1} sx={{ mt: 2.5 }}>
                  {allowed.map((targetId) => {
                    const target = statuses.find((status) => status.id === targetId);

                    return (
                      <Button
                        key={targetId}
                        variant={targetId === ORDER_STATUS.Cancelled ? 'outlined' : 'contained'}
                        color={targetId === ORDER_STATUS.Cancelled ? 'error' : 'primary'}
                        size="small"
                        disabled={updating}
                        onClick={() => changeStatus(targetId)}
                      >
                        {target?.name ?? targetId}
                      </Button>
                    );
                  })}
                </Stack>
              )}

              {allowed.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  {t('admin.noStatusTransition')}
                </Typography>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t('order.customer')} />
            <CardContent>
              <Typography variant="body2">{order.userName ?? 'Misafir'}</Typography>
              {order.userId && (
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                  {order.userId}
                </Typography>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t('order.address')} />
            <CardContent>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {[order.street, `${order.state ?? ''} / ${order.city ?? ''} ${order.zipcode ?? ''}`, order.country]
                  .filter(Boolean)
                  .join('\n')}
              </Typography>
            </CardContent>
          </Card>
        </div>
      </div>

      {dialog}
    </>
  );
}
