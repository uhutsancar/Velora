import { z } from 'zod';

export const productImageSchema = z.object({
  url: z.string().min(1, 'Görsel adresi gerekli').max(1000),
  altText: z.string().max(300).optional().nullable(),
  displayOrder: z.number().int().min(0),
  isPrimary: z.boolean(),
});

export const productVariantSchema = z.object({
  id: z.number().int().optional().nullable(),
  sku: z.string().max(64).optional().nullable(),
  color: z.string().max(64).optional().nullable(),
  colorHex: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Geçerli bir renk kodu girin')
    .optional()
    .nullable()
    .or(z.literal('')),
  size: z.string().max(32).optional().nullable(),
  priceAdjustment: z.number(),
  stock: z.number().int().min(0, 'Stok negatif olamaz'),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0),
});

export const productSchema = z
  .object({
    name: z.string().min(3, 'Ürün adı en az 3 karakter olmalı').max(200),
    slug: z
      .string()
      .regex(/^[a-z0-9-]*$/, 'Slug yalnızca küçük harf, rakam ve tire içerebilir')
      .max(220)
      .optional()
      .nullable()
      .or(z.literal('')),
    description: z.string().min(20, 'Açıklama en az 20 karakter olmalı').max(4000),
    shortDescription: z.string().max(500).optional().nullable().or(z.literal('')),
    price: z.number().positive('Fiyat sıfırdan büyük olmalı').max(9_999_999),
    discountPrice: z.number().min(0).max(9_999_999).optional().nullable(),
    costPrice: z.number().min(0).max(9_999_999).optional().nullable(),
    sku: z.string().max(64).optional().nullable().or(z.literal('')),
    barcode: z.string().max(64).optional().nullable().or(z.literal('')),
    categoryId: z.number().int().positive().optional().nullable(),
    catalogBrandId: z.number().int().positive('Marka seçin'),
    catalogTypeId: z.number().int().positive('Ürün tipi seçin'),
    availableStock: z.number().int().min(0, 'Stok negatif olamaz'),
    restockThreshold: z.number().int().min(0).max(1000),
    isPublished: z.boolean(),
    isFeatured: z.boolean(),
    metaTitle: z.string().max(200).optional().nullable().or(z.literal('')),
    metaDescription: z.string().max(400).optional().nullable().or(z.literal('')),
    tags: z.array(z.string().max(40)).max(20, 'En fazla 20 etiket eklenebilir'),
    images: z.array(productImageSchema).max(12, 'En fazla 12 görsel eklenebilir'),
    variants: z.array(productVariantSchema).max(60, 'En fazla 60 varyant eklenebilir'),
  })
  .refine((data) => data.discountPrice == null || data.discountPrice < data.price, {
    message: 'İndirimli fiyat liste fiyatından düşük olmalı',
    path: ['discountPrice'],
  })
  .refine((data) => data.costPrice == null || data.costPrice <= data.price, {
    message: 'Maliyet satış fiyatını aşmamalı',
    path: ['costPrice'],
  });

export const categorySchema = z.object({
  name: z.string().min(2, 'Kategori adı en az 2 karakter olmalı').max(150),
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/, 'Slug yalnızca küçük harf, rakam ve tire içerebilir')
    .max(170)
    .optional()
    .nullable()
    .or(z.literal('')),
  description: z.string().max(1000).optional().nullable().or(z.literal('')),
  parentId: z.number().int().positive().optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable().or(z.literal('')),
  displayOrder: z.number().int().min(0).max(1000),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  metaTitle: z.string().max(200).optional().nullable().or(z.literal('')),
  metaDescription: z.string().max(400).optional().nullable().or(z.literal('')),
});

export const brandSchema = z.object({
  name: z.string().min(2, 'Marka adı en az 2 karakter olmalı').max(100),
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/, 'Slug yalnızca küçük harf, rakam ve tire içerebilir')
    .max(120)
    .optional()
    .nullable()
    .or(z.literal('')),
  description: z.string().max(1000).optional().nullable().or(z.literal('')),
  logoUrl: z.string().max(500).optional().nullable().or(z.literal('')),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  displayOrder: z.number().int().min(0).max(1000),
});

export const adminCouponSchema = z
  .object({
    code: z
      .string()
      .min(3, 'Kupon kodu en az 3 karakter olmalı')
      .max(64)
      .regex(/^[A-Z0-9_-]+$/i, 'Kupon kodu harf, rakam, tire ve alt çizgi içerebilir'),
    description: z.string().max(500).optional().nullable().or(z.literal('')),
    discountType: z.number().int().min(0).max(2),
    discountValue: z.number().min(0).max(1_000_000),
    minimumOrderAmount: z.number().min(0).max(1_000_000),
    maxDiscountAmount: z.number().min(0).max(1_000_000).optional().nullable(),
    usageLimit: z.number().int().min(1).optional().nullable(),
    perUserLimit: z.number().int().min(1).max(100),
    startsAtUtc: z.string().min(1, 'Başlangıç tarihi gerekli'),
    endsAtUtc: z.string().min(1, 'Bitiş tarihi gerekli'),
    isActive: z.boolean(),
  })
  .refine((data) => new Date(data.endsAtUtc) > new Date(data.startsAtUtc), {
    message: 'Bitiş tarihi başlangıçtan sonra olmalı',
    path: ['endsAtUtc'],
  })
  .refine((data) => data.discountType !== 0 || (data.discountValue > 0 && data.discountValue <= 100), {
    message: 'Yüzde indirim 1 ile 100 arasında olmalı',
    path: ['discountValue'],
  })
  .refine((data) => data.discountType !== 1 || data.discountValue > 0, {
    message: 'Tutar indirimi sıfırdan büyük olmalı',
    path: ['discountValue'],
  });

export const campaignSchema = z
  .object({
    name: z.string().min(3, 'Kampanya adı en az 3 karakter olmalı').max(200),
    slug: z
      .string()
      .regex(/^[a-z0-9-]*$/, 'Slug yalnızca küçük harf, rakam ve tire içerebilir')
      .max(220)
      .optional()
      .nullable()
      .or(z.literal('')),
    description: z.string().max(1000).optional().nullable().or(z.literal('')),
    imageUrl: z.string().max(1000).optional().nullable().or(z.literal('')),
    bannerUrl: z.string().max(1000).optional().nullable().or(z.literal('')),
    ctaLabel: z.string().max(100).optional().nullable().or(z.literal('')),
    ctaUrl: z.string().max(500).optional().nullable().or(z.literal('')),
    discountPercentage: z.number().min(0).max(100),
    categoryId: z.number().int().positive().optional().nullable(),
    placement: z.number().int().min(0).max(3),
    startsAtUtc: z.string().min(1, 'Başlangıç tarihi gerekli'),
    endsAtUtc: z.string().min(1, 'Bitiş tarihi gerekli'),
    isActive: z.boolean(),
    displayOrder: z.number().int().min(0).max(1000),
  })
  .refine((data) => new Date(data.endsAtUtc) > new Date(data.startsAtUtc), {
    message: 'Bitiş tarihi başlangıçtan sonra olmalı',
    path: ['endsAtUtc'],
  });

export const userRolesSchema = z.object({
  roles: z.array(z.string().min(1)).min(1, 'En az bir rol seçin'),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Şifre en az 8 karakter olmalı').max(128),
});

export type ProductFormValues = z.infer<typeof productSchema>;
export type CategoryFormValues = z.infer<typeof categorySchema>;
export type BrandFormValues = z.infer<typeof brandSchema>;
export type AdminCouponFormValues = z.infer<typeof adminCouponSchema>;
export type CampaignFormValues = z.infer<typeof campaignSchema>;
export type UserRolesFormValues = z.infer<typeof userRolesSchema>;
