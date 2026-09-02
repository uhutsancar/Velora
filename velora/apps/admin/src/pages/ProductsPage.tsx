import {
  Button,
  Chip,
  IconButton,
  Stack,
  Switch,
  Tooltip,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  formatCurrency,
  localeFor,
  PERMISSIONS,
  PRODUCT_SORT,
  type ProductListItem,
} from '@velora/shared';
import { FilterBar, FilterSelect, SearchField } from '@/components/ui/Filters';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/Feedback';
import { useConfirm } from '@/hooks/useConfirm';
import { DEFAULT_PAGE_SIZE, env } from '@/config/env';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { useDeleteProductMutation, useGetAdminProductsQuery } from '@/store/api/catalogAdminApi';
import { useAppSelector } from '@/store/hooks';
import { selectHasPermission } from '@/store/slices/authSlice';
import { mediaUrl, PRODUCT_PLACEHOLDER } from '@/utils/media';

export default function ProductsPage() {
  const { t, i18n } = useTranslation();
  const locale = localeFor(i18n.language);
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = useAppSelector(selectHasPermission(PERMISSIONS.ProductsWrite));

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const debouncedSearch = useDebounce(search, 350);

  const [pagination, setPagination] = useState<GridPaginationModel>({
    page: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const publishedFilter = searchParams.get('published');
  const lowStockFilter = searchParams.get('lowStock') === 'true';

  const { data, isFetching, isError, refetch } = useGetAdminProductsQuery({
    search: debouncedSearch || undefined,
    published: publishedFilter === null ? undefined : publishedFilter === 'true',
    lowStock: lowStockFilter || undefined,
    sort: PRODUCT_SORT.Newest,
    pageIndex: pagination.page,
    pageSize: pagination.pageSize,
  });

  const [deleteProduct] = useDeleteProductMutation();

  const setFilter = (key: string, value: string | null) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);

      if (value === null) params.delete(key);
      else params.set(key, value);

      return params;
    });

    setPagination((current) => ({ ...current, page: 0 }));
  };

  const columns = useMemo<GridColDef<ProductListItem>[]>(
    () => [
      {
        field: 'image',
        headerName: '',
        width: 64,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <img
            src={mediaUrl(params.row.primaryImageUrl) ?? PRODUCT_PLACEHOLDER}
            alt=""
            loading="lazy"
            className="my-1 h-11 w-9 object-cover"
          />
        ),
      },
      {
        field: 'name',
        headerName: t('admin.product'),
        flex: 1,
        minWidth: 220,
        renderCell: (params) => (
          <div className="flex h-full min-w-0 flex-col justify-center">
            <Link
              to={`/products/${params.row.id}`}
              className="block truncate text-sm font-medium text-ink-900 hover:underline"
            >
              {params.row.name}
            </Link>
            <span className="block truncate text-xs text-ink-400">
              {params.row.brandName} · {params.row.categoryName ?? t('admin.uncategorized')}
            </span>
          </div>
        ),
      },
      {
        field: 'effectivePrice',
        headerName: t('admin.price'),
        width: 140,
        renderCell: (params) => (
          <div className="text-sm tabular-nums">
            {formatCurrency(params.row.effectivePrice, locale, env.currency)}
            {params.row.discountPercentage > 0 && (
              <span className="ml-1.5 text-xs text-danger-500">-%{params.row.discountPercentage}</span>
            )}
          </div>
        ),
      },
      {
        field: 'totalStock',
        headerName: t('admin.stock'),
        width: 110,
        renderCell: (params) => (
          <Chip
            size="small"
            variant="outlined"
            label={params.row.totalStock}
            color={
              params.row.totalStock === 0 ? 'error' : params.row.totalStock <= 5 ? 'warning' : 'default'
            }
          />
        ),
      },
      {
        field: 'ratingAverage',
        headerName: t('admin.rating'),
        width: 100,
        renderCell: (params) =>
          params.row.ratingCount > 0 ? (
            <span className="text-sm tabular-nums">
              {params.row.ratingAverage.toFixed(1)}{' '}
              <span className="text-xs text-ink-400">({params.row.ratingCount})</span>
            </span>
          ) : (
            <span className="text-xs text-ink-300">—</span>
          ),
      },
      {
        field: 'isFeatured',
        headerName: t('admin.featured'),
        width: 110,
        renderCell: (params) =>
          params.row.isFeatured ? <Chip size="small" label={t('common.yes')} color="secondary" /> : null,
      },
      {
        field: 'actions',
        headerName: '',
        width: 150,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title={t('admin.viewInStore')}>
              <IconButton
                size="small"
                component="a"
                href={`${env.storefrontUrl}/urun/${params.row.slug}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                <ExternalLink size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title={t('common.edit')}>
              <IconButton size="small" onClick={() => navigate(`/products/${params.row.id}`)}>
                <Pencil size={15} />
              </IconButton>
            </Tooltip>

            {canWrite && (
              <Tooltip title={t('common.delete')}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() =>
                    confirm({
                      title: t('common.delete'),
                      message: t('admin.deleteConfirm', { name: params.row.name }),
                      destructive: true,
                      confirmLabel: t('common.delete'),
                      onConfirm: async () => {
                        try {
                          await deleteProduct(params.row.id).unwrap();
                          toast.success(t('admin.deleted'));
                        } catch {
                          toast(t('admin.productDeleteFailed'), 'error');
                        }
                      },
                    })
                  }
                >
                  <Trash2 size={15} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ),
      },
    ],
    [canWrite, confirm, deleteProduct, locale, navigate, t, toast],
  );

  return (
    <>
      <PageHeader
        title={t('admin.products')}
        description={t('admin.productsSubtitle')}
        actions={
          canWrite && (
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => navigate('/products/new')}>
              {t('admin.newProduct')}
            </Button>
          )
        }
      />

      <FilterBar>
        <SearchField value={search} onChange={setSearch} placeholder={t('admin.productSearchPlaceholder')} />

        <FilterSelect
          label={t('order.status')}
          value={publishedFilter ?? 'all'}
          onChange={(event) => setFilter('published', event.target.value === 'all' ? null : event.target.value)}
          options={[
            { value: 'all', label: t('common.all') },
            { value: 'true', label: t('admin.published') },
            { value: 'false', label: t('admin.draft') },
          ]}
        />

        <Stack direction="row" alignItems="center" spacing={1}>
          <Switch
            checked={lowStockFilter}
            onChange={(event) => setFilter('lowStock', event.target.checked ? 'true' : null)}
            inputProps={{ 'aria-label': t('admin.lowStock') }}
          />
          <span className="text-sm text-ink-600">{t('admin.lowStock')}</span>
        </Stack>
      </FilterBar>

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <DataGrid
          rows={data?.items ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          rowHeight={60}
          loading={isFetching}
          disableRowSelectionOnClick
          disableColumnMenu
          paginationMode="server"
          rowCount={data?.totalCount ?? 0}
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[10, 20, 50]}
          sx={{ minHeight: 420 }}
        />
      )}

      {dialog}
    </>
  );
}
