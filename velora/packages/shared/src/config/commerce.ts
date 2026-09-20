/**
 * Commercial terms quoted to the shopper.
 *
 * These numbers appear in at least four places each — the basket summary, the
 * checkout total, the announcement bar and the help centre — and a mismatch
 * between them is a customer-service problem, not a cosmetic one. They live
 * here so the storefront, the admin app and the content pages read one value.
 *
 * The free-shipping threshold also has to match the minimum order on the KARGO
 * coupon seeded in CatalogService; changing it here means changing it there.
 */
export const COMMERCE = {
  /** Order total, in the store currency, above which domestic shipping is free. */
  freeShippingThreshold: 500,

  /** Flat domestic shipping fee charged below the threshold. */
  shippingFee: 49.9,

  /** Velora's own return window. The statutory minimum is 14 days. */
  returnDays: 30,

  /** Warranty against manufacturing and workmanship defects. */
  warrantyYears: 2,

  /** Local cut-off for same-day dispatch on working days. */
  sameDayCutoff: '14.00',

  /** Working-day delivery estimate shown on product and checkout pages. */
  deliveryDays: { min: 1, max: 4 },
} as const;

export type CommerceTerms = typeof COMMERCE;
