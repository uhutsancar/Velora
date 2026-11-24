import { z } from 'zod';

export const addressSchema = z.object({
  title: z.string().min(2, 'Adres başlığı en az 2 karakter olmalı').max(64),
  firstName: z.string().min(2, 'Ad gerekli').max(128),
  lastName: z.string().min(2, 'Soyad gerekli').max(128),
  phone: z.string().regex(/^[0-9+\s()-]{10,20}$/, 'Geçerli bir telefon numarası girin'),
  street: z.string().min(10, 'Açık adres en az 10 karakter olmalı').max(256),
  city: z.string().min(2, 'İl gerekli').max(128),
  state: z.string().min(2, 'İlçe gerekli').max(128),
  country: z.string().min(2, 'Ülke gerekli').max(128),
  zipCode: z.string().regex(/^\d{5}$/, 'Posta kodu 5 haneli olmalı'),
  isDefault: z.boolean(),
});

export const paymentSchema = z.object({
  paymentMethodToken: z.string().min(8, 'Ödeme sağlayıcı tokenı gerekli').max(512),
  paymentProvider: z.string().min(2).max(64),
});

export const checkoutSchema = z.object({
  addressId: z.string().min(1, 'Teslimat adresi seçin'),
  payment: paymentSchema,
  saveCard: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export const couponSchema = z.object({
  code: z
    .string()
    .min(3, 'Kupon kodu en az 3 karakter olmalı')
    .max(64)
    .transform((value) => value.trim().toUpperCase()),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Puan verin').max(5),
  title: z.string().max(200).optional().or(z.literal('')),
  comment: z.string().min(5, 'Yorum en az 5 karakter olmalı').max(2000),
});

export type AddressFormValues = z.infer<typeof addressSchema>;
export type PaymentFormValues = z.infer<typeof paymentSchema>;
export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
export type CouponFormValues = z.infer<typeof couponSchema>;
export type ReviewFormValues = z.infer<typeof reviewSchema>;

/**
 * Contact form. Deliberately narrower than the free-text box it looks like:
 * the subject is a closed list so support can route on it, and the message is
 * capped at 2000 characters, the same ceiling a review has.
 */
export const CONTACT_SUBJECTS = ['order', 'return', 'repair', 'product', 'other'] as const;

export const contactSchema = z.object({
  name: z.string().min(2, 'Ad soyad en az 2 karakter olmalı').max(128),
  email: z.string().min(1, 'E-posta gerekli').email('Geçerli bir e-posta girin').max(256),
  orderNumber: z.string().max(64).optional().or(z.literal('')),
  subject: z.enum(CONTACT_SUBJECTS, { error: 'Bir konu seçin' }),
  message: z.string().min(20, 'Mesaj en az 20 karakter olmalı').max(2000),
  consent: z.literal(true, {
    error: 'Devam etmek için aydınlatma metnini onaylamalısınız',
  }),
});

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];
export type ContactFormValues = z.infer<typeof contactSchema>;
