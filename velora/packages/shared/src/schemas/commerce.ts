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

/** Luhn check — catches typos before the request ever leaves the browser. */
const luhnValid = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13) return false;

  let sum = 0;
  let double = false;

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);

    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
};

export const paymentSchema = z.object({
  cardHolderName: z.string().min(5, 'Kart üzerindeki ismi girin').max(200),
  cardNumber: z
    .string()
    .transform((value) => value.replace(/\s/g, ''))
    .refine((value) => /^\d{13,19}$/.test(value), 'Kart numarası 13-19 hane olmalı')
    .refine(luhnValid, 'Kart numarası geçersiz'),
  cardExpiration: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Son kullanma tarihi AA/YY biçiminde olmalı')
    .refine((value) => {
      const [month, year] = value.split('/');
      const expiry = new Date(2000 + Number(year), Number(month), 0, 23, 59, 59);
      return expiry > new Date();
    }, 'Kartın süresi dolmuş'),
  cardSecurityNumber: z.string().regex(/^\d{3,4}$/, 'CVV 3 veya 4 hane olmalı'),
  cardTypeId: z.number().int().min(1).max(3),
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
