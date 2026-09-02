import { z } from 'zod';

/**
 * Password policy mirrored from IdentityService (min length 8). The frontend adds
 * composition hints for usability; the backend remains the authority.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Şifre en az 8 karakter olmalı')
  .max(128, 'Şifre en fazla 128 karakter olabilir')
  .regex(/[a-zçğıöşü]/, 'Şifre en az bir küçük harf içermeli')
  .regex(/[A-ZÇĞİÖŞÜ]/, 'Şifre en az bir büyük harf içermeli')
  .regex(/\d/, 'Şifre en az bir rakam içermeli');

export const loginSchema = z.object({
  userName: z.string().min(1, 'E-posta veya kullanıcı adı gerekli').max(256),
  password: z.string().min(1, 'Şifre gerekli'),
});

export const registerSchema = z
  .object({
    firstName: z.string().min(2, 'Ad en az 2 karakter olmalı').max(128),
    lastName: z.string().min(2, 'Soyad en az 2 karakter olmalı').max(128),
    email: z.string().min(1, 'E-posta gerekli').email('Geçerli bir e-posta girin').max(256),
    phoneNumber: z
      .string()
      .regex(/^[0-9+\s()-]{10,20}$/, 'Geçerli bir telefon numarası girin')
      .optional()
      .or(z.literal('')),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Şifre tekrarı gerekli'),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Devam etmek için sözleşmeyi onaylamalısınız' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mevcut şifre gerekli'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Şifre tekrarı gerekli'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Yeni şifre mevcut şifreden farklı olmalı',
    path: ['newPassword'],
  });

export const profileSchema = z.object({
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalı').max(128),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalı').max(128),
  phoneNumber: z
    .string()
    .regex(/^[0-9+\s()-]{10,20}$/, 'Geçerli bir telefon numarası girin')
    .optional()
    .or(z.literal('')),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
