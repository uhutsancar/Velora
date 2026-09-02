import {
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Form, Formik } from 'formik';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  adminCouponSchema,
  CAMPAIGN_PLACEMENT,
  DISCOUNT_TYPE,
  formatCurrency,
  formatDate,
  localeFor,
  campaignSchema,
  slugify,
  zodValidator,
  type AdminCouponFormValues,
  type Campaign,
  type CampaignFormValues,
  type CampaignPlacement,
  type CampaignRequest,
  type Coupon,
  type CouponRequest,
  type DiscountType,
} from '@velora/shared';
import { FormNumber, FormSelect, FormSwitch, FormText } from '@/components/form/fields';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingScreen } from '@/components/ui/Feedback';
import { useConfirm } from '@/hooks/useConfirm';
import { env } from '@/config/env';
import { useToast } from '@/hooks/useToast';
import {
  useCreateCampaignMutation,
  useCreateCouponMutation,
  useDeleteCampaignMutation,
  useDeleteCouponMutation,
  useGetAdminCampaignsQuery,
  useGetAdminCategoriesQuery,
  useGetAdminCouponsQuery,
  useUpdateCampaignMutation,
  useUpdateCouponMutation,
} from '@/store/api/catalogAdminApi';
import { mediaUrl } from '@/utils/media';

/** ISO timestamp -> value accepted by <input type="datetime-local">. */
const toLocalInput = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIso = (local: string): string => (local ? new Date(local).toISOString() : new Date().toISOString());

/** Translation keys, resolved at render time so the console follows the active language. */
const DISCOUNT_LABEL_KEYS: Record<number, string> = {
  [DISCOUNT_TYPE.Percentage]: 'admin.typePercentage',
  [DISCOUNT_TYPE.FixedAmount]: 'admin.typeAmount',
  [DISCOUNT_TYPE.FreeShipping]: 'admin.typeFreeShipping',
};

const emptyCoupon = (): AdminCouponFormValues => ({
  code: '',
  description: '',
  discountType: DISCOUNT_TYPE.Percentage,
  discountValue: 10,
  minimumOrderAmount: 0,
  maxDiscountAmount: null,
  usageLimit: null,
  perUserLimit: 1,
  startsAtUtc: toLocalInput(new Date().toISOString()),
  endsAtUtc: toLocalInput(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()),
  isActive: true,
});

export function CouponsPage() {
  const { t, i18n } = useTranslation();
  const locale = localeFor(i18n.language);
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const { data, isLoading, isError, refetch } = useGetAdminCouponsQuery({ pageSize: 100 });
  const [createCoupon, { isLoading: creating }] = useCreateCouponMutation();
  const [updateCoupon, { isLoading: updating }] = useUpdateCouponMutation();
  const [deleteCoupon] = useDeleteCouponMutation();

  const [editing, setEditing] = useState<{ id: number | null; values: AdminCouponFormValues } | null>(null);

  const columns = useMemo<GridColDef<Coupon>[]>(
    () => [
      {
        field: 'code',
        headerName: t('admin.code'),
        width: 170,
        renderCell: (params) => (
          <span className="font-mono text-sm font-medium text-ink-900">{params.row.code}</span>
        ),
      },
      {
        field: 'discountValue',
        headerName: t('admin.discount'),
        width: 150,
        renderCell: (params) =>
          params.row.discountType === DISCOUNT_TYPE.Percentage
            ? `%${params.row.discountValue}`
            : params.row.discountType === DISCOUNT_TYPE.FixedAmount
              ? formatCurrency(params.row.discountValue, locale, env.currency)
              : t(DISCOUNT_LABEL_KEYS[params.row.discountType] ?? 'admin.discount'),
      },
      {
        field: 'minimumOrderAmount',
        headerName: t('admin.minBasket'),
        width: 130,
        renderCell: (params) => formatCurrency(params.row.minimumOrderAmount, locale, env.currency),
      },
      {
        field: 'usedCount',
        headerName: t('admin.usage'),
        width: 120,
        renderCell: (params) => `${params.row.usedCount}${params.row.usageLimit ? ` / ${params.row.usageLimit}` : ''}`,
      },
      {
        field: 'endsAtUtc',
        headerName: t('admin.endDate'),
        width: 140,
        renderCell: (params) => formatDate(params.row.endsAtUtc, locale),
      },
      {
        field: 'isActive',
        headerName: t('order.status'),
        width: 110,
        renderCell: (params) => {
          const expired = new Date(params.row.endsAtUtc) < new Date();

          return (
            <Chip
              size="small"
              label={
                expired ? t('admin.statusExpired') : params.row.isActive ? t('common.active') : t('common.inactive')
              }
              color={expired ? 'default' : params.row.isActive ? 'success' : 'default'}
              variant={params.row.isActive && !expired ? 'filled' : 'outlined'}
            />
          );
        },
      },
      {
        field: 'actions',
        headerName: '',
        width: 100,
        sortable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => (
          <Stack direction="row">
            <IconButton
              size="small"
              onClick={() =>
                setEditing({
                  id: params.row.id,
                  values: {
                    code: params.row.code,
                    description: params.row.description ?? '',
                    discountType: params.row.discountType,
                    discountValue: params.row.discountValue,
                    minimumOrderAmount: params.row.minimumOrderAmount,
                    maxDiscountAmount: params.row.maxDiscountAmount,
                    usageLimit: params.row.usageLimit,
                    perUserLimit: params.row.perUserLimit,
                    startsAtUtc: toLocalInput(params.row.startsAtUtc),
                    endsAtUtc: toLocalInput(params.row.endsAtUtc),
                    isActive: params.row.isActive,
                  },
                })
              }
            >
              <Pencil size={15} />
            </IconButton>

            <IconButton
              size="small"
              color="error"
              onClick={() =>
                confirm({
                  title: t('common.delete'),
                  message: t('admin.deleteConfirm', { name: params.row.code }),
                  destructive: true,
                  confirmLabel: t('common.delete'),
                  onConfirm: async () => {
                    try {
                      await deleteCoupon(params.row.id).unwrap();
                      toast.success(t('admin.deleted'));
                    } catch {
                      toast('Kupon silinemedi', 'error');
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
    [confirm, deleteCoupon, locale, t, toast],
  );

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const save = async (values: AdminCouponFormValues) => {
    const body: CouponRequest = {
      ...values,
      code: values.code.trim().toUpperCase(),
      description: values.description || null,
      discountType: values.discountType as DiscountType,
      startsAtUtc: toIso(values.startsAtUtc),
      endsAtUtc: toIso(values.endsAtUtc),
    };

    try {
      if (editing?.id) await updateCoupon({ id: editing.id, body }).unwrap();
      else await createCoupon(body).unwrap();

      toast.success(t('admin.saved'));
      setEditing(null);
    } catch (error) {
      toast.error(error, 'Kupon kaydedilemedi');
    }
  };

  return (
    <>
      <PageHeader
        title={t('admin.coupons')}
        description={t('admin.couponsSubtitle')}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setEditing({ id: null, values: emptyCoupon() })}
          >
            Yeni kupon
          </Button>
        }
      />

      <DataGrid
        rows={data?.items ?? []}
        columns={columns}
        getRowId={(row) => row.id}
        disableColumnMenu
        disableRowSelectionOnClick
        hideFooterSelectedRowCount
        sx={{ minHeight: 420 }}
      />

      <Dialog open={editing !== null} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?.id ? t('common.edit') : 'Yeni kupon'}</DialogTitle>

        {editing && (
          <Formik<AdminCouponFormValues>
            initialValues={editing.values}
            validate={zodValidator<AdminCouponFormValues>(adminCouponSchema)}
            onSubmit={save}
          >
            {({ values }) => (
              <Form>
                <DialogContent>
                  <Stack spacing={2.5} sx={{ pt: 1 }}>
                    <FormText
                      name="code"
                      label={t('admin.couponCode')}
                      transform={(raw) => raw.toUpperCase()}
                      required
                    />
                    <FormText name="description" label={t('admin.description')} />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormSelect
                        name="discountType"
                        label={t('admin.discountType')}
                        parse={Number}
                        options={Object.entries(DISCOUNT_LABEL_KEYS).map(([value, labelKey]) => ({
                          value: Number(value),
                          label: t(labelKey),
                        }))}
                      />
                      <FormNumber
                        name="discountValue"
                        label={
                          values.discountType === DISCOUNT_TYPE.Percentage
                            ? t('admin.typePercentage')
                            : t('admin.typeAmount')
                        }
                        disabled={values.discountType === DISCOUNT_TYPE.FreeShipping}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormNumber name="minimumOrderAmount" label={t('admin.minBasketAmount')} />
                      <FormNumber
                        name="maxDiscountAmount"
                        label={t('admin.maxDiscount')}
                        hint={t('admin.maxDiscountHint')}
                        nullable
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormNumber
                        name="usageLimit"
                        label={t('admin.totalUsageLimit')}
                        hint={t('admin.unlimitedHint')}
                        nullable
                        integer
                      />
                      <FormNumber name="perUserLimit" label={t('admin.perUser')} integer />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormText
                        name="startsAtUtc"
                        label={t('admin.startDate')}
                        type="datetime-local"
                        InputLabelProps={{ shrink: true }}
                      />
                      <FormText
                        name="endsAtUtc"
                        label={t('admin.endDate')}
                        type="datetime-local"
                        InputLabelProps={{ shrink: true }}
                      />
                    </div>

                    <FormSwitch name="isActive" label={t('common.active')} />
                  </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                  <Button color="inherit" onClick={() => setEditing(null)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" variant="contained" disabled={creating || updating}>
                    {t('common.save')}
                  </Button>
                </DialogActions>
              </Form>
            )}
          </Formik>
        )}
      </Dialog>

      {dialog}
    </>
  );
}

const PLACEMENT_LABEL_KEYS: Record<number, string> = {
  [CAMPAIGN_PLACEMENT.Home]: 'admin.placementHome',
  [CAMPAIGN_PLACEMENT.Hero]: 'admin.placementHero',
  [CAMPAIGN_PLACEMENT.Banner]: 'admin.placementBanner',
  [CAMPAIGN_PLACEMENT.Collection]: 'admin.placementCollection',
};

const emptyCampaign = (): CampaignFormValues => ({
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  bannerUrl: '',
  ctaLabel: '',
  ctaUrl: '',
  discountPercentage: 0,
  categoryId: null,
  placement: CAMPAIGN_PLACEMENT.Home,
  startsAtUtc: toLocalInput(new Date().toISOString()),
  endsAtUtc: toLocalInput(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()),
  isActive: true,
  displayOrder: 0,
});

export function CampaignsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const { data: campaigns = [], isLoading, isError, refetch } = useGetAdminCampaignsQuery();
  const { data: categories = [] } = useGetAdminCategoriesQuery();

  const [createCampaign, { isLoading: creating }] = useCreateCampaignMutation();
  const [updateCampaign, { isLoading: updating }] = useUpdateCampaignMutation();
  const [deleteCampaign] = useDeleteCampaignMutation();

  const [editing, setEditing] = useState<{ id: number | null; values: CampaignFormValues } | null>(null);

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const save = async (values: CampaignFormValues) => {
    const body: CampaignRequest = {
      ...values,
      placement: values.placement as CampaignPlacement,
      slug: values.slug || slugify(values.name),
      description: values.description || null,
      imageUrl: values.imageUrl || null,
      bannerUrl: values.bannerUrl || null,
      ctaLabel: values.ctaLabel || null,
      ctaUrl: values.ctaUrl || null,
      startsAtUtc: toIso(values.startsAtUtc),
      endsAtUtc: toIso(values.endsAtUtc),
    };

    try {
      if (editing?.id) await updateCampaign({ id: editing.id, body }).unwrap();
      else await createCampaign(body).unwrap();

      toast.success(t('admin.saved'));
      setEditing(null);
    } catch (error) {
      toast.error(error, 'Kampanya kaydedilemedi');
    }
  };

  const openEditor = (campaign: Campaign) =>
    setEditing({
      id: campaign.id,
      values: {
        name: campaign.name,
        slug: campaign.slug,
        description: campaign.description ?? '',
        imageUrl: campaign.imageUrl ?? '',
        bannerUrl: campaign.bannerUrl ?? '',
        ctaLabel: campaign.ctaLabel ?? '',
        ctaUrl: campaign.ctaUrl ?? '',
        discountPercentage: campaign.discountPercentage,
        categoryId: campaign.categoryId,
        placement: campaign.placement,
        startsAtUtc: toLocalInput(campaign.startsAtUtc),
        endsAtUtc: toLocalInput(campaign.endsAtUtc),
        isActive: campaign.isActive,
        displayOrder: campaign.displayOrder,
      },
    });

  return (
    <>
      <PageHeader
        title={t('admin.campaigns')}
        description={t('admin.campaignsSubtitle')}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setEditing({ id: null, values: emptyCampaign() })}
          >
            Yeni kampanya
          </Button>
        }
      />

      {campaigns.length === 0 ? (
        <Card>
          <EmptyState title={t('admin.noCampaigns')} description={t('admin.noCampaignsBody')} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => {
            const live = campaign.isActive && new Date(campaign.endsAtUtc) > new Date();

            return (
              <Card key={campaign.id}>
                <div className="relative aspect-[16/9] bg-surface-sunken">
                  {(campaign.bannerUrl ?? campaign.imageUrl) && (
                    <img
                      src={mediaUrl(campaign.bannerUrl ?? campaign.imageUrl) ?? ''}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}

                  <Chip
                    size="small"
                    label={live ? t('admin.published') : t('common.inactive')}
                    color={live ? 'success' : 'default'}
                    sx={{ position: 'absolute', top: 8, left: 8 }}
                  />
                </div>

                <div className="p-4">
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">{campaign.name}</p>
                      <p className="truncate text-xs text-ink-400">
                        {t(PLACEMENT_LABEL_KEYS[campaign.placement] ?? 'admin.placement')} · /{campaign.slug}
                      </p>
                    </div>

                    <Stack direction="row">
                      <IconButton size="small" onClick={() => openEditor(campaign)}>
                        <Pencil size={15} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                          confirm({
                            title: t('common.delete'),
                            message: t('admin.deleteConfirm', { name: campaign.name }),
                            destructive: true,
                            confirmLabel: t('common.delete'),
                            onConfirm: async () => {
                              try {
                                await deleteCampaign(campaign.id).unwrap();
                                toast.success(t('admin.deleted'));
                              } catch {
                                toast('Kampanya silinemedi', 'error');
                              }
                            },
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </Stack>
                  </Stack>

                  {campaign.discountPercentage > 0 && (
                    <Chip size="small" label={`%${campaign.discountPercentage}`} sx={{ mt: 1 }} />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?.id ? t('common.edit') : 'Yeni kampanya'}</DialogTitle>

        {editing && (
          <Formik<CampaignFormValues>
            initialValues={editing.values}
            validate={zodValidator<CampaignFormValues>(campaignSchema)}
            onSubmit={save}
          >
            <Form>
              <DialogContent>
                <Stack spacing={2.5} sx={{ pt: 1 }}>
                  <FormText name="name" label={t('admin.campaignName')} required />
                  <FormText name="description" label={t('admin.description')} multiline rows={2} />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormSelect
                      name="placement"
                      label={t('admin.placement')}
                      parse={Number}
                      options={Object.entries(PLACEMENT_LABEL_KEYS).map(([value, labelKey]) => ({
                        value: Number(value),
                        label: t(labelKey),
                      }))}
                    />
                    <FormSelect
                      name="categoryId"
                      label={t('admin.category')}
                      parse={(raw) => (raw === '' ? null : Number(raw))}
                      options={[
                        { value: '', label: 'Yok' },
                        ...categories.map((category) => ({ value: category.id, label: category.name })),
                      ]}
                    />
                  </div>

                  <FormText name="bannerUrl" label={t('admin.bannerImage')} />
                  <FormText name="imageUrl" label={t('admin.squareImage')} />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormText name="ctaLabel" label={t('admin.ctaLabel')} />
                    <FormText name="ctaUrl" label={t('admin.ctaUrl')} placeholder="/kategori/kadin" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormNumber name="discountPercentage" label={t('admin.discountPercentage')} />
                    <FormNumber name="displayOrder" label={t('admin.sortOrder')} integer />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormText
                      name="startsAtUtc"
                      label={t('admin.startDate')}
                      type="datetime-local"
                      InputLabelProps={{ shrink: true }}
                    />
                    <FormText
                      name="endsAtUtc"
                      label={t('admin.endDate')}
                      type="datetime-local"
                      InputLabelProps={{ shrink: true }}
                    />
                  </div>

                  <FormSwitch name="isActive" label={t('common.active')} />
                </Stack>
              </DialogContent>

              <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button color="inherit" onClick={() => setEditing(null)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" variant="contained" disabled={creating || updating}>
                  {t('common.save')}
                </Button>
              </DialogActions>
            </Form>
          </Formik>
        )}
      </Dialog>

      {dialog}
    </>
  );
}
