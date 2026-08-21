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
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { Form, Formik } from 'formik';
import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  brandSchema,
  categorySchema,
  isNormalizedApiError,
  slugify,
  zodValidator,
  type Brand,
  type BrandFormValues,
  type BrandRequest,
  type Category,
  type CategoryFormValues,
  type CategoryRequest,
} from '@velora/shared';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingScreen } from '@/components/ui/Feedback';
import { useConfirm } from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import {
  useCreateBrandMutation,
  useCreateCategoryMutation,
  useDeleteBrandMutation,
  useDeleteCategoryMutation,
  useGetAdminBrandsQuery,
  useGetAdminCategoriesQuery,
  useUpdateBrandMutation,
  useUpdateCategoryMutation,
} from '@/store/api/catalogAdminApi';
import { mediaUrl } from '@/utils/media';

const emptyCategory: CategoryFormValues = {
  name: '',
  slug: '',
  description: '',
  parentId: null,
  imageUrl: '',
  displayOrder: 0,
  isActive: true,
  isFeatured: false,
  metaTitle: '',
  metaDescription: '',
};

export function CategoriesPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const { data: categories = [], isLoading, isError, refetch } = useGetAdminCategoriesQuery();
  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: updating }] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  const [editing, setEditing] = useState<{ id: number | null; values: CategoryFormValues } | null>(null);

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const roots = categories.filter((category) => category.parentId === null);
  const childrenOf = (parentId: number) => categories.filter((category) => category.parentId === parentId);

  const toRequest = (values: CategoryFormValues): CategoryRequest => ({
    ...values,
    slug: values.slug || slugify(values.name),
    description: values.description || null,
    imageUrl: values.imageUrl || null,
    metaTitle: values.metaTitle || null,
    metaDescription: values.metaDescription || null,
  });

  const save = async (values: CategoryFormValues) => {
    try {
      if (editing?.id) await updateCategory({ id: editing.id, body: toRequest(values) }).unwrap();
      else await createCategory(toRequest(values)).unwrap();

      toast(t('admin.saved'), 'success');
      setEditing(null);
    } catch (error) {
      toast(isNormalizedApiError(error) ? error.message : 'Kategori kaydedilemedi', 'error');
    }
  };

  const renderRow = (category: Category, depth: number) => (
    <div key={category.id}>
      <div
        className="flex items-center gap-3 border-b border-ink-100 px-4 py-3"
        style={{ paddingLeft: 16 + depth * 24 }}
      >
        {depth > 0 && <ChevronRight size={14} className="shrink-0 text-ink-300" />}

        {category.imageUrl && (
          <img
            src={mediaUrl(category.imageUrl) ?? ''}
            alt=""
            loading="lazy"
            className="h-9 w-9 shrink-0 rounded object-cover"
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-900">{category.name}</p>
          <p className="truncate text-xs text-ink-400">/{category.slug}</p>
        </div>

        <Chip size="small" variant="outlined" label={t('common.productCount', { count: category.productCount })} />

        {category.isFeatured && <Chip size="small" color="secondary" label={t('admin.featured')} />}
        {!category.isActive && <Chip size="small" label={t('common.inactive')} />}

        <IconButton
          size="small"
          onClick={() =>
            setEditing({
              id: category.id,
              values: {
                name: category.name,
                slug: category.slug,
                description: category.description ?? '',
                parentId: category.parentId,
                imageUrl: category.imageUrl ?? '',
                displayOrder: category.displayOrder,
                isActive: category.isActive,
                isFeatured: category.isFeatured,
                metaTitle: category.metaTitle ?? '',
                metaDescription: category.metaDescription ?? '',
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
              message: t('admin.deleteConfirm', { name: category.name }),
              destructive: true,
              confirmLabel: t('common.delete'),
              onConfirm: async () => {
                try {
                  await deleteCategory(category.id).unwrap();
                  toast(t('admin.deleted'), 'success');
                } catch (error) {
                  toast(isNormalizedApiError(error) ? error.message : 'Kategori silinemedi', 'error');
                }
              },
            })
          }
        >
          <Trash2 size={15} />
        </IconButton>
      </div>

      {childrenOf(category.id).map((child) => renderRow(child, depth + 1))}
    </div>
  );

  return (
    <>
      <PageHeader
        title={t('admin.categories')}
        description={t('admin.categoriesSubtitle')}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setEditing({ id: null, values: emptyCategory })}
          >
            Yeni kategori
          </Button>
        }
      />

      <Card>
        {roots.length === 0 ? (
          <EmptyState title={t('admin.noCategories')} description={t('admin.noCategoriesBody')} />
        ) : (
          roots.map((category) => renderRow(category, 0))
        )}
      </Card>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?.id ? t('common.edit') : 'Yeni kategori'}</DialogTitle>

        {editing && (
          <Formik<CategoryFormValues>
            initialValues={editing.values}
            validate={zodValidator<CategoryFormValues>(categorySchema)}
            onSubmit={save}
          >
            {({ values, errors, touched, handleChange, setFieldValue }) => (
              <Form>
                <DialogContent>
                  <Stack spacing={2.5} sx={{ pt: 1 }}>
                    <TextField
                      name="name"
                      label={t('admin.categoryName')}
                      value={values.name}
                      onChange={handleChange}
                      error={Boolean(touched.name && errors.name)}
                      helperText={touched.name ? errors.name : undefined}
                      fullWidth
                      required
                    />

                    <TextField
                      name="slug"
                      label="Slug"
                      value={values.slug ?? ''}
                      onChange={handleChange}
                      error={Boolean(touched.slug && errors.slug)}
                      helperText={touched.slug ? errors.slug : t('admin.slugHint')}
                      fullWidth
                    />

                    <TextField
                      select
                      name="parentId"
                      label={t('admin.parentCategory')}
                      value={values.parentId ?? ''}
                      onChange={(event) =>
                        void setFieldValue('parentId', event.target.value === '' ? null : Number(event.target.value))
                      }
                      fullWidth
                    >
                      <MenuItem value="">Ana kategori</MenuItem>
                      {categories
                        .filter((category) => category.id !== editing.id)
                        .map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.parentId ? `— ${category.name}` : category.name}
                          </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                      name="description"
                      label={t('admin.description')}
                      value={values.description ?? ''}
                      onChange={handleChange}
                      fullWidth
                      multiline
                      rows={2}
                    />

                    <TextField
                      name="imageUrl"
                      label={t('admin.imageUrl')}
                      value={values.imageUrl ?? ''}
                      onChange={handleChange}
                      fullWidth
                    />

                    <TextField
                      name="displayOrder"
                      label={t('admin.sortOrder')}
                      type="number"
                      value={values.displayOrder}
                      onChange={(event) => void setFieldValue('displayOrder', Number(event.target.value))}
                      fullWidth
                    />

                    <Stack direction="row" spacing={2}>
                      <FormControlLabel
                        control={<Switch name="isActive" checked={values.isActive} onChange={handleChange} />}
                        label={t('common.active')}
                      />
                      <FormControlLabel
                        control={<Switch name="isFeatured" checked={values.isFeatured} onChange={handleChange} />}
                        label={t('admin.featured')}
                      />
                    </Stack>
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

const emptyBrand: BrandFormValues = {
  name: '',
  slug: '',
  description: '',
  logoUrl: '',
  isActive: true,
  isFeatured: false,
  displayOrder: 0,
};

export function BrandsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const { data: brands = [], isLoading, isError, refetch } = useGetAdminBrandsQuery();
  const [createBrand, { isLoading: creating }] = useCreateBrandMutation();
  const [updateBrand, { isLoading: updating }] = useUpdateBrandMutation();
  const [deleteBrand] = useDeleteBrandMutation();

  const [editing, setEditing] = useState<{ id: number | null; values: BrandFormValues } | null>(null);

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const toRequest = (values: BrandFormValues): BrandRequest => ({
    ...values,
    slug: values.slug || slugify(values.name),
    description: values.description || null,
    logoUrl: values.logoUrl || null,
  });

  const save = async (values: BrandFormValues) => {
    try {
      if (editing?.id) await updateBrand({ id: editing.id, body: toRequest(values) }).unwrap();
      else await createBrand(toRequest(values)).unwrap();

      toast(t('admin.saved'), 'success');
      setEditing(null);
    } catch (error) {
      toast(isNormalizedApiError(error) ? error.message : 'Marka kaydedilemedi', 'error');
    }
  };

  const openEditor = (brand: Brand) =>
    setEditing({
      id: brand.id,
      values: {
        name: brand.name,
        slug: brand.slug ?? '',
        description: brand.description ?? '',
        logoUrl: brand.logoUrl ?? '',
        isActive: brand.isActive,
        isFeatured: brand.isFeatured,
        displayOrder: brand.displayOrder,
      },
    });

  return (
    <>
      <PageHeader
        title={t('admin.brands')}
        description={t('admin.brandsSubtitle')}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setEditing({ id: null, values: emptyBrand })}
          >
            Yeni marka
          </Button>
        }
      />

      {brands.length === 0 ? (
        <Card>
          <EmptyState title={t('admin.noBrands')} description={t('admin.noBrandsBody')} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {brands.map((brand) => (
            <Card key={brand.id} sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                {brand.logoUrl && (
                  <img
                    src={mediaUrl(brand.logoUrl) ?? ''}
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded object-contain"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{brand.name}</p>
                  <p className="truncate text-xs text-ink-400">/{brand.slug}</p>

                  <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
                    <Chip size="small" variant="outlined" label={t('common.productCount', { count: brand.productCount })} />
                    {brand.isFeatured && <Chip size="small" color="secondary" label={t('admin.featured')} />}
                    {!brand.isActive && <Chip size="small" label={t('common.inactive')} />}
                  </Stack>
                </div>

                <Stack direction="row">
                  <IconButton size="small" onClick={() => openEditor(brand)}>
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() =>
                      confirm({
                        title: t('common.delete'),
                        message: t('admin.deleteConfirm', { name: brand.name }),
                        destructive: true,
                        confirmLabel: t('common.delete'),
                        onConfirm: async () => {
                          try {
                            await deleteBrand(brand.id).unwrap();
                            toast(t('admin.deleted'), 'success');
                          } catch (error) {
                            toast(isNormalizedApiError(error) ? error.message : 'Marka silinemedi', 'error');
                          }
                        },
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </Stack>
              </Stack>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?.id ? t('common.edit') : 'Yeni marka'}</DialogTitle>

        {editing && (
          <Formik<BrandFormValues>
            initialValues={editing.values}
            validate={zodValidator<BrandFormValues>(brandSchema)}
            onSubmit={save}
          >
            {({ values, errors, touched, handleChange, setFieldValue }) => (
              <Form>
                <DialogContent>
                  <Stack spacing={2.5} sx={{ pt: 1 }}>
                    <TextField
                      name="name"
                      label={t('admin.brandName')}
                      value={values.name}
                      onChange={handleChange}
                      error={Boolean(touched.name && errors.name)}
                      helperText={touched.name ? errors.name : undefined}
                      fullWidth
                      required
                    />
                    <TextField
                      name="slug"
                      label="Slug"
                      value={values.slug ?? ''}
                      onChange={handleChange}
                      fullWidth
                      helperText={t('admin.slugHint')}
                    />
                    <TextField
                      name="description"
                      label={t('admin.description')}
                      value={values.description ?? ''}
                      onChange={handleChange}
                      fullWidth
                      multiline
                      rows={2}
                    />
                    <TextField
                      name="logoUrl"
                      label={t('admin.logoUrl')}
                      value={values.logoUrl ?? ''}
                      onChange={handleChange}
                      fullWidth
                    />
                    <TextField
                      name="displayOrder"
                      label={t('admin.sortOrder')}
                      type="number"
                      value={values.displayOrder}
                      onChange={(event) => void setFieldValue('displayOrder', Number(event.target.value))}
                      fullWidth
                    />

                    <Stack direction="row" spacing={2}>
                      <FormControlLabel
                        control={<Switch name="isActive" checked={values.isActive} onChange={handleChange} />}
                        label={t('common.active')}
                      />
                      <FormControlLabel
                        control={<Switch name="isFeatured" checked={values.isFeatured} onChange={handleChange} />}
                        label={t('admin.featured')}
                      />
                    </Stack>
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
