import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { FieldArray, Form, Formik, type FormikHelpers } from 'formik';
import { ArrowLeft, ImagePlus, Plus, Star, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  isNormalizedApiError,
  productSchema,
  slugify,
  zodValidator,
  type ProductFormValues,
  type ProductRequest,
} from '@velora/shared';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingScreen } from '@/components/ui/Feedback';
import { env } from '@/config/env';
import { useToast } from '@/hooks/useToast';
import {
  uploadMedia,
  useCreateProductMutation,
  useGetAdminBrandsQuery,
  useGetAdminCategoriesQuery,
  useGetAdminProductQuery,
  useUpdateProductMutation,
} from '@/store/api/catalogAdminApi';
import { mediaUrl, PRODUCT_PLACEHOLDER } from '@/utils/media';

/**
 * CatalogType is the legacy eShop taxonomy the API still requires. It is not
 * surfaced as a first-class concept in the UI, so new products default to the
 * first available type unless the record already has one.
 */
const DEFAULT_CATALOG_TYPE_ID = 1;

const emptyProduct: ProductFormValues = {
  name: '',
  slug: '',
  description: '',
  shortDescription: '',
  price: 0,
  discountPrice: null,
  costPrice: null,
  sku: '',
  barcode: '',
  categoryId: null,
  catalogBrandId: 0,
  catalogTypeId: DEFAULT_CATALOG_TYPE_ID,
  availableStock: 0,
  restockThreshold: 5,
  isPublished: true,
  isFeatured: false,
  metaTitle: '',
  metaDescription: '',
  tags: [],
  images: [],
  variants: [],
};

export default function ProductFormPage() {
  const { id } = useParams();
  const isNew = id === 'new' || id === undefined;
  const productId = isNew ? 0 : Number(id);

  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const {
    data: product,
    isLoading,
    isError,
    refetch,
  } = useGetAdminProductQuery(productId, { skip: isNew });

  const { data: categories = [] } = useGetAdminCategoriesQuery();
  const { data: brands = [] } = useGetAdminBrandsQuery();

  const [createProduct, { isLoading: creating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();

  const [tab, setTab] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialValues = useMemo<ProductFormValues>(() => {
    if (isNew || !product) {
      return { ...emptyProduct, catalogBrandId: brands[0]?.id ?? 0 };
    }

    return {
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription ?? '',
      price: product.price,
      discountPrice: product.discountPrice,
      costPrice: product.costPrice,
      sku: product.sku ?? '',
      barcode: product.barcode ?? '',
      categoryId: product.categoryId,
      catalogBrandId: product.catalogBrandId,
      catalogTypeId: product.catalogTypeId || DEFAULT_CATALOG_TYPE_ID,
      availableStock: product.availableStock,
      restockThreshold: product.restockThreshold,
      isPublished: product.isPublished,
      isFeatured: product.isFeatured,
      metaTitle: product.metaTitle ?? '',
      metaDescription: product.metaDescription ?? '',
      tags: [...product.tags],
      images: product.images.map((image) => ({
        url: image.url,
        altText: image.altText,
        displayOrder: image.displayOrder,
        isPrimary: image.isPrimary,
      })),
      variants: product.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        color: variant.color,
        colorHex: variant.colorHex,
        size: variant.size,
        priceAdjustment: variant.priceAdjustment,
        stock: variant.stock,
        isActive: variant.isActive,
        displayOrder: variant.displayOrder,
      })),
    };
  }, [brands, isNew, product]);

  const submit = async (values: ProductFormValues, helpers: FormikHelpers<ProductFormValues>) => {
    const body: ProductRequest = {
      ...values,
      slug: values.slug || slugify(values.name),
      shortDescription: values.shortDescription || null,
      sku: values.sku || null,
      barcode: values.barcode || null,
      metaTitle: values.metaTitle || null,
      metaDescription: values.metaDescription || null,
      images: values.images.map((image, index) => ({
        url: image.url,
        altText: image.altText ?? null,
        displayOrder: index,
        isPrimary: index === 0 ? true : Boolean(image.isPrimary),
      })),
      variants: values.variants.map((variant, index) => ({
        id: variant.id ?? null,
        sku: variant.sku || null,
        color: variant.color || null,
        colorHex: variant.colorHex || null,
        size: variant.size || null,
        priceAdjustment: variant.priceAdjustment,
        stock: variant.stock,
        isActive: variant.isActive,
        displayOrder: index,
      })),
    };

    try {
      if (isNew) {
        const created = await createProduct(body).unwrap();
        toast(t('admin.saved'), 'success');
        navigate(`/products/${created.id}`, { replace: true });
      } else {
        await updateProduct({ id: productId, body }).unwrap();
        toast(t('admin.saved'), 'success');
        helpers.resetForm({ values });
      }
    } catch (error) {
      toast(isNormalizedApiError(error) ? error.message : t('admin.productSaveFailed'), 'error');
    }
  };

  if (!isNew && isLoading) return <LoadingScreen />;
  if (!isNew && isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <Formik<ProductFormValues>
      initialValues={initialValues}
      enableReinitialize
      validate={zodValidator<ProductFormValues>(productSchema)}
      onSubmit={submit}
    >
      {({ values, errors, touched, handleChange, handleBlur, setFieldValue, dirty }) => {
        // Formik errors for arrays/objects are not strings; only surface leaf messages.
        const fieldError = (name: keyof ProductFormValues): string | undefined => {
          const error = errors[name];
          return touched[name] && typeof error === 'string' ? error : undefined;
        };

        const handleUpload = async (files: FileList | null) => {
          if (!files || files.length === 0) return;

          setUploading(true);

          try {
            const uploaded = await uploadMedia([...files]);

            await setFieldValue('images', [
              ...values.images,
              ...uploaded.map((media, index) => ({
                url: media.url,
                altText: values.name,
                displayOrder: values.images.length + index,
                isPrimary: values.images.length === 0 && index === 0,
              })),
            ]);

            toast(t('admin.imagesUploaded', { count: uploaded.length }), 'success');
          } catch (error) {
            toast(isNormalizedApiError(error) ? error.message : t('admin.imageUploadFailed'), 'error');
          } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        };

        return (
          <Form>
            <PageHeader
              title={isNew ? t('admin.newProduct') : values.name || t('admin.editProduct')}
              breadcrumbs={[
                { label: t('admin.products'), to: '/products' },
                { label: isNew ? t('common.create') : t('common.edit') },
              ]}
              actions={
                <>
                  <Button
                    color="inherit"
                    startIcon={<ArrowLeft size={16} />}
                    onClick={() => navigate('/products')}
                  >
                    {t('common.back')}
                  </Button>
                  <Button type="submit" variant="contained" disabled={creating || updating || (!isNew && !dirty)}>
                    {creating || updating ? t('common.loading') : t('common.save')}
                  </Button>
                </>
              }
            />

            <Tabs value={tab} onChange={(_event, next: number) => setTab(next)} sx={{ mb: 3 }}>
              <Tab label={t('admin.tabGeneral')} />
              <Tab label={t('admin.tabImages', { count: values.images.length })} />
              <Tab label={t('admin.tabVariants', { count: values.variants.length })} />
              <Tab label={t('admin.tabSeo')} />
            </Tabs>

            {tab === 0 && (
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                  <Card>
                    <CardHeader title={t('admin.productInfo')} titleTypographyProps={{ variant: 'h5' }} />
                    <CardContent>
                      <Stack spacing={2.5}>
                        <TextField
                          name="name"
                          label={t('admin.productName')}
                          value={values.name}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={Boolean(fieldError('name'))}
                          helperText={fieldError('name')}
                          fullWidth
                          required
                        />

                        <TextField
                          name="slug"
                          label={t('admin.urlSlug')}
                          value={values.slug ?? ''}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={Boolean(fieldError('slug'))}
                          helperText={
                            fieldError('slug') ??
                            `${env.storefrontUrl}/urun/${values.slug || slugify(values.name) || '...'}`
                          }
                          fullWidth
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <Button
                                  size="small"
                                  onClick={() => void setFieldValue('slug', slugify(values.name))}
                                >
                                  {t('admin.generate')}
                                </Button>
                              </InputAdornment>
                            ),
                          }}
                        />

                        <TextField
                          name="shortDescription"
                          label={t('admin.shortDescription')}
                          value={values.shortDescription ?? ''}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={Boolean(fieldError('shortDescription'))}
                          helperText={fieldError('shortDescription') ?? t('admin.shortDescriptionHint')}
                          fullWidth
                          multiline
                          rows={2}
                        />

                        <TextField
                          name="description"
                          label={t('admin.description')}
                          value={values.description}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={Boolean(fieldError('description'))}
                          helperText={fieldError('description')}
                          fullWidth
                          multiline
                          rows={7}
                          required
                        />
                      </Stack>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader title={t('admin.pricing')} titleTypographyProps={{ variant: 'h5' }} />
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <NumberField
                          name="price"
                          label={t('admin.listPrice')}
                          value={values.price}
                          onChange={setFieldValue}
                          onBlur={handleBlur}
                          error={fieldError('price')}
                          required
                        />
                        <NumberField
                          name="discountPrice"
                          label={t('admin.salePrice')}
                          value={values.discountPrice ?? null}
                          onChange={setFieldValue}
                          onBlur={handleBlur}
                          error={fieldError('discountPrice')}
                          nullable
                        />
                        <NumberField
                          name="costPrice"
                          label={t('admin.cost')}
                          value={values.costPrice ?? null}
                          onChange={setFieldValue}
                          onBlur={handleBlur}
                          error={fieldError('costPrice')}
                          nullable
                          helperText={t('admin.costHint')}
                        />
                      </div>

                      {values.costPrice != null && values.costPrice > 0 && values.price > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                          {t('admin.grossMargin')}{' '}
                          <strong>
                            %
                            {(
                              (((values.discountPrice ?? values.price) - values.costPrice) /
                                (values.discountPrice ?? values.price)) *
                              100
                            ).toFixed(1)}
                          </strong>
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardHeader title={t('admin.publishing')} titleTypographyProps={{ variant: 'h5' }} />
                    <CardContent>
                      <Stack spacing={1}>
                        <FormControlLabel
                          control={
                            <Switch
                              name="isPublished"
                              checked={values.isPublished}
                              onChange={handleChange}
                            />
                          }
                          label={values.isPublished ? t('admin.published') : t('admin.draft')}
                        />
                        <FormControlLabel
                          control={
                            <Switch name="isFeatured" checked={values.isFeatured} onChange={handleChange} />
                          }
                          label={t('admin.featureOnHome')}
                        />
                      </Stack>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader title={t('admin.classification')} titleTypographyProps={{ variant: 'h5' }} />
                    <CardContent>
                      <Stack spacing={2.5}>
                        <TextField
                          select
                          name="catalogBrandId"
                          label={t('admin.brand')}
                          value={values.catalogBrandId || ''}
                          onChange={handleChange}
                          error={Boolean(fieldError('catalogBrandId'))}
                          helperText={fieldError('catalogBrandId')}
                          fullWidth
                          required
                        >
                          {brands.map((brand) => (
                            <MenuItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </MenuItem>
                          ))}
                        </TextField>

                        <TextField
                          select
                          name="categoryId"
                          label={t('admin.category')}
                          value={values.categoryId ?? ''}
                          onChange={(event) =>
                            void setFieldValue(
                              'categoryId',
                              event.target.value === '' ? null : Number(event.target.value),
                            )
                          }
                          fullWidth
                        >
                          <MenuItem value="">Kategorisiz</MenuItem>
                          {categories.map((category) => (
                            <MenuItem key={category.id} value={category.id}>
                              {category.parentId ? `— ${category.name}` : category.name}
                            </MenuItem>
                          ))}
                        </TextField>

                        <TextField
                          name="sku"
                          label="SKU"
                          value={values.sku ?? ''}
                          onChange={handleChange}
                          fullWidth
                        />

                        <TagsField
                          tags={values.tags}
                          onChange={(next) => void setFieldValue('tags', next)}
                        />
                      </Stack>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader title={t('admin.stock')} titleTypographyProps={{ variant: 'h5' }} />
                    <CardContent>
                      <Stack spacing={2.5}>
                        <NumberField
                          name="availableStock"
                          label={t('admin.mainStock')}
                          value={values.availableStock}
                          onChange={setFieldValue}
                          onBlur={handleBlur}
                          error={fieldError('availableStock')}
                          integer
                          helperText={
                            values.variants.length > 0
                              ? t('admin.variantStockHint')
                              : undefined
                          }
                        />
                        <NumberField
                          name="restockThreshold"
                          label={t('admin.lowStockThreshold')}
                          value={values.restockThreshold}
                          onChange={setFieldValue}
                          onBlur={handleBlur}
                          error={fieldError('restockThreshold')}
                          integer
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {tab === 1 && (
              <Card>
                <CardHeader
                  title={t('admin.images')}
                  subheader={t('admin.imagesHint')}
                  titleTypographyProps={{ variant: 'h5' }}
                  action={
                    <Button
                      variant="outlined"
                      startIcon={<Upload size={16} />}
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? t('admin.uploading') : t('admin.uploadImage')}
                    </Button>
                  }
                />
                <CardContent>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                    multiple
                    hidden
                    onChange={(event) => void handleUpload(event.target.files)}
                  />

                  <FieldArray name="images">
                    {(imageHelpers) => (
                      <>
                        {values.images.length === 0 ? (
                          <div className="flex flex-col items-center gap-3 py-14 text-center">
                            <ImagePlus className="h-10 w-10 text-ink-300" />
                            <p className="text-sm text-ink-500">{t('admin.noImages')}</p>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              {t('admin.uploadImage')}
                            </Button>
                          </div>
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                            {values.images.map((image, index) => (
                              <div key={`${image.url}-${index}`} className="group relative border border-ink-100">
                                <img
                                  src={mediaUrl(image.url) ?? PRODUCT_PLACEHOLDER}
                                  alt={image.altText ?? ''}
                                  loading="lazy"
                                  className="aspect-[4/5] w-full object-cover"
                                />

                                {index === 0 && (
                                  <Chip
                                    size="small"
                                    icon={<Star size={12} />}
                                    label={t('admin.cover')}
                                    color="secondary"
                                    sx={{ position: 'absolute', top: 6, left: 6 }}
                                  />
                                )}

                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  sx={{
                                    position: 'absolute',
                                    bottom: 6,
                                    right: 6,
                                    bgcolor: 'rgba(255,255,255,0.92)',
                                    borderRadius: 0.5,
                                  }}
                                >
                                  <Tooltip title={t('admin.moveLeft')}>
                                    <span>
                                      <IconButton
                                        size="small"
                                        disabled={index === 0}
                                        onClick={() => { imageHelpers.swap(index, index - 1); }}
                                      >
                                        ←
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  <Tooltip title={t('admin.moveRight')}>
                                    <span>
                                      <IconButton
                                        size="small"
                                        disabled={index === values.images.length - 1}
                                        onClick={() => { imageHelpers.swap(index, index + 1); }}
                                      >
                                        →
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  <Tooltip title={t('common.delete')}>
                                    <IconButton size="small" color="error" onClick={() => { imageHelpers.remove(index); }}>
                                      <Trash2 size={14} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </FieldArray>
                </CardContent>
              </Card>
            )}

            {tab === 2 && (
              <Card>
                <CardHeader
                  title={t('admin.variants')}
                  subheader={t('admin.variantsHint')}
                  titleTypographyProps={{ variant: 'h5' }}
                />
                <CardContent>
                  <FieldArray name="variants">
                    {(variantHelpers) => (
                      <>
                        <Stack spacing={2}>
                          {values.variants.map((variant, index) => (
                            <div key={variant.id ?? `new-${index}`}>
                              <div className="grid items-start gap-3 sm:grid-cols-12">
                                <TextField
                                  label={t('admin.color')}
                                  name={`variants.${index}.color`}
                                  value={variant.color ?? ''}
                                  onChange={handleChange}
                                  className="sm:col-span-3"
                                  fullWidth
                                />
                                <TextField
                                  label={t('admin.colorCode')}
                                  name={`variants.${index}.colorHex`}
                                  value={variant.colorHex ?? ''}
                                  onChange={handleChange}
                                  placeholder="#12100E"
                                  className="sm:col-span-2"
                                  fullWidth
                                  InputProps={{
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        <span
                                          className="h-4 w-4 rounded-full border border-ink-200"
                                          style={{ backgroundColor: variant.colorHex ?? '#EFEEEC' }}
                                        />
                                      </InputAdornment>
                                    ),
                                  }}
                                />
                                <TextField
                                  label={t('admin.size')}
                                  name={`variants.${index}.size`}
                                  value={variant.size ?? ''}
                                  onChange={handleChange}
                                  className="sm:col-span-2"
                                  fullWidth
                                />
                                <TextField
                                  label={t('admin.priceDiff')}
                                  type="number"
                                  name={`variants.${index}.priceAdjustment`}
                                  value={variant.priceAdjustment}
                                  onChange={(event) =>
                                    void setFieldValue(
                                      `variants.${index}.priceAdjustment`,
                                      Number(event.target.value),
                                    )
                                  }
                                  className="sm:col-span-2"
                                  fullWidth
                                />
                                <TextField
                                  label={t('admin.stock')}
                                  type="number"
                                  name={`variants.${index}.stock`}
                                  value={variant.stock}
                                  onChange={(event) =>
                                    void setFieldValue(`variants.${index}.stock`, Number(event.target.value))
                                  }
                                  className="sm:col-span-2"
                                  fullWidth
                                />

                                <Stack direction="row" alignItems="center" className="sm:col-span-1">
                                  <Tooltip title={variant.isActive ? 'Aktif' : 'Pasif'}>
                                    <Switch
                                      name={`variants.${index}.isActive`}
                                      checked={variant.isActive}
                                      onChange={handleChange}
                                      size="small"
                                    />
                                  </Tooltip>
                                  <IconButton size="small" color="error" onClick={() => { variantHelpers.remove(index); }}>
                                    <Trash2 size={15} />
                                  </IconButton>
                                </Stack>
                              </div>

                              <Divider sx={{ mt: 2 }} />
                            </div>
                          ))}
                        </Stack>

                        <Button
                          startIcon={<Plus size={16} />}
                          sx={{ mt: 2 }}
                          onClick={() => {
                            variantHelpers.push({
                              id: null,
                              sku: '',
                              color: '',
                              colorHex: '',
                              size: '',
                              priceAdjustment: 0,
                              stock: 0,
                              isActive: true,
                              displayOrder: values.variants.length,
                            });
                          }}
                        >
                          Varyant ekle
                        </Button>
                      </>
                    )}
                  </FieldArray>
                </CardContent>
              </Card>
            )}

            {tab === 3 && (
              <Card sx={{ maxWidth: 720 }}>
                <CardHeader
                  title={t('admin.seoSection')}
                  subheader={t('admin.seoHint')}
                  titleTypographyProps={{ variant: 'h5' }}
                />
                <CardContent>
                  <Stack spacing={2.5}>
                    <TextField
                      name="metaTitle"
                      label={t('admin.metaTitle')}
                      value={values.metaTitle ?? ''}
                      onChange={handleChange}
                      fullWidth
                      helperText={t('admin.metaTitleHint', { count: (values.metaTitle ?? '').length })}
                    />
                    <TextField
                      name="metaDescription"
                      label={t('admin.metaDescription')}
                      value={values.metaDescription ?? ''}
                      onChange={handleChange}
                      fullWidth
                      multiline
                      rows={3}
                      helperText={t('admin.metaDescriptionHint', { count: (values.metaDescription ?? '').length })}
                    />

                    {/* Live SERP preview: the fastest way to catch a truncated title. */}
                    <div className="border border-ink-100 bg-surface-muted p-4">
                      <p className="text-xs text-ink-400">
                        {env.storefrontUrl}/urun/{values.slug || slugify(values.name)}
                      </p>
                      <p className="mt-1 text-base text-[#1a0dab]">
                        {values.metaTitle || `${values.name} | Velora`}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-600">
                        {values.metaDescription || values.shortDescription || values.description.slice(0, 158)}
                      </p>
                    </div>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Form>
        );
      }}
    </Formik>
  );
}

/** Numeric input that keeps Formik's value a number (or null) rather than a string. */
function NumberField({
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required,
  nullable,
  integer,
}: {
  name: string;
  label: string;
  value: number | null;
  onChange: (field: string, value: number | null) => void;
  onBlur: React.FocusEventHandler;
  error?: string | undefined;
  helperText?: string;
  required?: boolean;
  nullable?: boolean;
  integer?: boolean;
}) {
  return (
    <TextField
      name={name}
      label={label}
      type="number"
      value={value ?? ''}
      onChange={(event) => {
        const raw = event.target.value;

        if (raw === '') {
          onChange(name, nullable ? null : 0);
          return;
        }

        onChange(name, integer ? Math.trunc(Number(raw)) : Number(raw));
      }}
      onBlur={onBlur}
      error={Boolean(error)}
      helperText={error ?? helperText}
      required={required}
      fullWidth
      inputProps={{ min: 0, step: integer ? 1 : 0.01 }}
    />
  );
}

function TagsField({ tags, onChange }: { tags: string[]; onChange: (next: string[]) => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const add = () => {
    const value = draft.trim().toLowerCase();
    if (value === '' || tags.includes(value)) return;

    onChange([...tags, value]);
    setDraft('');
  };

  return (
    <div>
      <TextField
        label={t('admin.tags')}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            add();
          }
        }}
        fullWidth
        helperText={t('admin.tagsHint')}
      />

      {tags.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1 }}>
          {tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              onDelete={() => onChange(tags.filter((item) => item !== tag))}
            />
          ))}
        </Stack>
      )}
    </div>
  );
}
