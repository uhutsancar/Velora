import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema, changePasswordSchema } from './auth';
import { addressSchema, couponSchema, paymentSchema, reviewSchema } from './commerce';
import { adminCouponSchema, productSchema } from './admin';
import { zodValidator } from './formik';

const validRegister = {
  firstName: 'Uhut',
  lastName: 'Sancar',
  email: 'uhut@velora.com',
  phoneNumber: '0555 555 55 55',
  password: 'Velora2024',
  confirmPassword: 'Velora2024',
  acceptTerms: true as const,
};

describe('loginSchema', () => {
  it('accepts an email and password', () => {
    expect(loginSchema.safeParse({ userName: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ userName: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts a complete form', () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true);
  });

  it('requires the password confirmation to match', () => {
    const result = registerSchema.safeParse({ ...validRegister, confirmPassword: 'Different1' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['confirmPassword']);
    }
  });

  it('enforces the same minimum length the backend does', () => {
    expect(registerSchema.safeParse({ ...validRegister, password: 'Ab1', confirmPassword: 'Ab1' }).success).toBe(
      false,
    );
  });

  it('requires an uppercase letter and a digit', () => {
    expect(
      registerSchema.safeParse({ ...validRegister, password: 'velorapass', confirmPassword: 'velorapass' })
        .success,
    ).toBe(false);
  });

  it('requires the terms checkbox', () => {
    expect(registerSchema.safeParse({ ...validRegister, acceptTerms: false }).success).toBe(false);
  });

  it('treats the phone number as optional', () => {
    const { phoneNumber: _phoneNumber, ...withoutPhone } = validRegister;
    expect(registerSchema.safeParse({ ...withoutPhone, phoneNumber: '' }).success).toBe(true);
  });
});

describe('changePasswordSchema', () => {
  it('rejects reusing the current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'Velora2024',
      newPassword: 'Velora2024',
      confirmPassword: 'Velora2024',
    });

    expect(result.success).toBe(false);
  });
});

describe('addressSchema', () => {
  const address = {
    title: 'Ev',
    firstName: 'Uhut',
    lastName: 'Sancar',
    phone: '05555555555',
    street: 'Kemankeş Mah. Karaköy Cad. No 12 D 4',
    city: 'İstanbul',
    state: 'Beyoğlu',
    country: 'Turkiye',
    zipCode: '34425',
    isDefault: false,
  };

  it('accepts a complete address', () => {
    expect(addressSchema.safeParse(address).success).toBe(true);
  });

  it('requires a five digit postcode', () => {
    expect(addressSchema.safeParse({ ...address, zipCode: '123' }).success).toBe(false);
  });
});

describe('paymentSchema', () => {
  const nextYear = String((new Date().getFullYear() + 2) % 100).padStart(2, '0');

  const payment = {
    cardHolderName: 'UHUT SANCAR',
    // Passes the Luhn check.
    cardNumber: '4242424242424242',
    cardExpiration: `12/${nextYear}`,
    cardSecurityNumber: '123',
    cardTypeId: 2,
  };

  it('accepts a valid card', () => {
    expect(paymentSchema.safeParse(payment).success).toBe(true);
  });

  it('strips spaces from the card number before validating', () => {
    const result = paymentSchema.safeParse({ ...payment, cardNumber: '4242 4242 4242 4242' });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.cardNumber).toBe('4242424242424242');
  });

  it('rejects a card number that fails the Luhn check', () => {
    expect(paymentSchema.safeParse({ ...payment, cardNumber: '4242424242424243' }).success).toBe(false);
  });

  it('rejects an expired card', () => {
    expect(paymentSchema.safeParse({ ...payment, cardExpiration: '01/20' }).success).toBe(false);
  });

  it('rejects a malformed expiry', () => {
    expect(paymentSchema.safeParse({ ...payment, cardExpiration: '13/29' }).success).toBe(false);
  });
});

describe('couponSchema', () => {
  it('upper-cases and trims the code', () => {
    const result = couponSchema.safeParse({ code: '  velora10 ' });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.code).toBe('VELORA10');
  });
});

describe('reviewSchema', () => {
  it('requires a rating between 1 and 5', () => {
    expect(reviewSchema.safeParse({ rating: 0, comment: 'harika' }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 6, comment: 'harika' }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 5, comment: 'harika ürün' }).success).toBe(true);
  });
});

describe('productSchema', () => {
  const product = {
    name: 'Aurora Omuz Çantası',
    slug: 'aurora-omuz-cantasi',
    description: 'Yumuşak dana derisinden el yapımı omuz çantası, günlük kullanıma uygun.',
    shortDescription: 'El yapımı omuz çantası',
    price: 4890,
    discountPrice: 3990,
    costPrice: 1850,
    sku: 'VLR-AURORA',
    barcode: '',
    categoryId: 1,
    catalogBrandId: 1,
    catalogTypeId: 1,
    availableStock: 24,
    restockThreshold: 5,
    isPublished: true,
    isFeatured: true,
    metaTitle: '',
    metaDescription: '',
    tags: ['yeni', 'deri'],
    images: [{ url: '/media/a.jpg', altText: null, displayOrder: 0, isPrimary: true }],
    variants: [],
  };

  it('accepts a complete product', () => {
    expect(productSchema.safeParse(product).success).toBe(true);
  });

  it('rejects a discount price above the list price', () => {
    const result = productSchema.safeParse({ ...product, discountPrice: 5000 });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['discountPrice']);
  });

  it('rejects a cost above the sale price', () => {
    const result = productSchema.safeParse({ ...product, costPrice: 9000 });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid slug', () => {
    expect(productSchema.safeParse({ ...product, slug: 'Büyük Harf' }).success).toBe(false);
  });

  it('rejects a non-positive price', () => {
    expect(productSchema.safeParse({ ...product, price: 0, discountPrice: null }).success).toBe(false);
  });
});

describe('adminCouponSchema', () => {
  const base = {
    code: 'VELORA10',
    description: '',
    discountType: 0,
    discountValue: 10,
    minimumOrderAmount: 1000,
    maxDiscountAmount: 1500,
    usageLimit: 1000,
    perUserLimit: 1,
    startsAtUtc: '2026-01-01T00:00',
    endsAtUtc: '2026-06-01T00:00',
    isActive: true,
  };

  it('accepts a valid percentage coupon', () => {
    expect(adminCouponSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a percentage above 100', () => {
    expect(adminCouponSchema.safeParse({ ...base, discountValue: 120 }).success).toBe(false);
  });

  it('rejects an end date before the start date', () => {
    const result = adminCouponSchema.safeParse({ ...base, endsAtUtc: '2025-01-01T00:00' });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['endsAtUtc']);
  });
});

describe('zodValidator (Formik adapter)', () => {
  it('returns an empty object when the form is valid', () => {
    const validate = zodValidator(loginSchema);
    expect(validate({ userName: 'a@b.com', password: 'secret' })).toEqual({});
  });

  it('maps issues onto Formik field paths', () => {
    const validate = zodValidator(loginSchema);
    const errors = validate({ userName: '', password: '' });

    expect(errors).toHaveProperty('userName');
    expect(errors).toHaveProperty('password');
  });

  it('nests array item errors so FieldArray can address them', () => {
    const validate = zodValidator(productSchema);

    const errors = validate({
      name: 'Test Ürün',
      slug: '',
      description: 'Yeterince uzun bir ürün açıklaması buraya yazıldı.',
      shortDescription: '',
      price: 100,
      discountPrice: null,
      costPrice: null,
      sku: '',
      barcode: '',
      categoryId: null,
      catalogBrandId: 1,
      catalogTypeId: 1,
      availableStock: 1,
      restockThreshold: 5,
      isPublished: true,
      isFeatured: false,
      metaTitle: '',
      metaDescription: '',
      tags: [],
      images: [],
      variants: [{ id: null, sku: '', color: '', colorHex: 'not-a-colour', size: '', priceAdjustment: 0, stock: -1, isActive: true, displayOrder: 0 }],
    });

    expect(Array.isArray((errors as { variants?: unknown }).variants)).toBe(true);
  });
});
