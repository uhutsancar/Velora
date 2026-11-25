import {
  CAMPAIGN_PLACEMENT,
  type Campaign,
  type Category,
  type ProductListItem,
} from '@velora/shared';

/**
 * Curated storefront content used when the catalogue service is unavailable or
 * has not been seeded yet. API data remains the source of truth when present.
 */
export const SHOWCASE_PRODUCTS: ProductListItem[] = [
  product({
    id: -101,
    name: 'Aurora Omuz Çantası',
    slug: 'aurora-omuz-cantasi',
    description: 'Yumuşak dana derisinden, elde tamamlanan zamansız omuz çantası.',
    price: 4890,
    discountPrice: 3990,
    image: 'bag-aurora-black.jpg',
    hoverImage: 'hero-autumn.jpg',
    brand: 'Velora Atelier',
    category: 'Kadın Çanta',
    rating: 4.9,
    ratingCount: 86,
    stock: 24,
    featured: true,
    isNew: true,
    swatches: [
      { color: 'Siyah', colorHex: '#12100E' },
      { color: 'Kum', colorHex: '#D8C3A5' },
      { color: 'Bordo', colorHex: '#5C1F2B' },
    ],
  }),
  product({
    id: -102,
    name: 'Nova Deri Tote',
    slug: 'nova-tote',
    description: '15 inç laptop bölmeli, iş ve şehir hayatı için geniş deri tote.',
    price: 3890,
    image: 'bag-nova-ivory.jpg',
    hoverImage: 'atelier-craft.jpg',
    brand: 'Velora Studio',
    category: 'Kadın Çanta',
    rating: 4.8,
    ratingCount: 54,
    stock: 18,
    featured: true,
    swatches: [
      { color: 'Fildişi', colorHex: '#EFE7DA' },
      { color: 'Siyah', colorHex: '#12100E' },
    ],
  }),
  product({
    id: -103,
    name: 'Atlas Evrak Çantası',
    slug: 'atlas-evrak-cantasi',
    description: 'Tam tabaklanmış deriden, 16 inç laptop bölmeli profesyonel çanta.',
    price: 7450,
    discountPrice: 6290,
    image: 'briefcase-atlas-cognac.jpg',
    hoverImage: 'laptop-sedir-brown.jpg',
    brand: 'Velora Signature',
    category: 'Erkek Evrak Çantası',
    rating: 4.9,
    ratingCount: 41,
    stock: 8,
    featured: true,
    swatches: [
      { color: 'Konyak', colorHex: '#A65E2E' },
      { color: 'Siyah', colorHex: '#12100E' },
    ],
  }),
  product({
    id: -104,
    name: 'Orion Şehir Sırt Çantası',
    slug: 'orion-sirt-cantasi',
    description: 'Deri ve su itici teknik kumaşı birleştiren hafif şehir çantası.',
    price: 4990,
    image: 'backpack-orion-black.jpg',
    hoverImage: 'hero-autumn.jpg',
    brand: 'Velora Studio',
    category: 'Erkek Sırt Çantası',
    rating: 4.7,
    ratingCount: 37,
    stock: 26,
    featured: true,
    isNew: true,
    swatches: [
      { color: 'Siyah', colorHex: '#12100E' },
      { color: 'Haki', colorHex: '#3F4A3C' },
    ],
  }),
  product({
    id: -105,
    name: 'Mira Deri Cüzdan',
    slug: 'mira-deri-cuzdan',
    description: 'RFID korumalı, on iki kart bölmeli ince fermuarlı cüzdan.',
    price: 1590,
    image: 'wallet-mira-cognac.jpg',
    hoverImage: 'campaign-first-order.jpg',
    brand: 'Velora Essentials',
    category: 'Cüzdan',
    rating: 4.8,
    ratingCount: 128,
    stock: 60,
    swatches: [
      { color: 'Konyak', colorHex: '#A65E2E' },
      { color: 'Siyah', colorHex: '#12100E' },
      { color: 'Yeşil', colorHex: '#243D30' },
    ],
  }),
  product({
    id: -106,
    name: 'Kastor Deri Derby',
    slug: 'kastor-deri-derby',
    description: 'Goodyear dikişli, tabanı yenilenebilir tam deri klasik ayakkabı.',
    price: 6890,
    image: 'shoes-kastor-black.jpg',
    hoverImage: 'atelier-craft.jpg',
    brand: 'Velora Atelier',
    category: 'Erkek Ayakkabı',
    rating: 4.9,
    ratingCount: 32,
    stock: 11,
    featured: true,
    swatches: [
      { color: 'Siyah', colorHex: '#12100E' },
      { color: 'Kahve', colorHex: '#4A2C1A' },
    ],
  }),
  product({
    id: -107,
    name: 'Meridian Weekender',
    slug: 'meridian-weekender',
    description: 'Ayakkabı bölmeli, iki gecelik yolculuklara özel deri seyahat çantası.',
    price: 8900,
    discountPrice: 7490,
    image: 'weekender-meridian-brown.jpg',
    hoverImage: 'hero-autumn.jpg',
    brand: 'Velora Travel',
    category: 'Seyahat',
    rating: 4.9,
    ratingCount: 29,
    stock: 6,
    featured: true,
    swatches: [
      { color: 'Kahve', colorHex: '#4A2C1A' },
      { color: 'Siyah', colorHex: '#12100E' },
    ],
  }),
  product({
    id: -108,
    name: 'Kompas Kabin Valizi',
    slug: 'kompas-kabin-valizi',
    description: 'Alüminyum çerçeveli, TSA kilitli ve sessiz tekerlekli kabin valizi.',
    price: 6490,
    image: 'luggage-kompas-anthracite.jpg',
    hoverImage: 'weekender-meridian-brown.jpg',
    brand: 'Velora Travel',
    category: 'Valiz',
    rating: 4.8,
    ratingCount: 47,
    stock: 15,
    featured: true,
    isNew: true,
    swatches: [
      { color: 'Antrasit', colorHex: '#2E3134' },
      { color: 'Şampanya', colorHex: '#C6B79B' },
    ],
  }),
];

export const SHOWCASE_CATEGORIES: Category[] = [
  category(-201, 'Kadın', 'kadin', 'hero-autumn.jpg', 18),
  category(-202, 'Erkek', 'erkek', 'briefcase-atlas-cognac.jpg', 14),
  category(-203, 'Seyahat', 'seyahat', 'weekender-meridian-brown.jpg', 7),
  category(-204, 'Ofis', 'ofis', 'laptop-sedir-brown.jpg', 8),
];

export const SHOWCASE_HERO_CAMPAIGNS: Campaign[] = [
  {
    id: -301,
    name: 'Şehrin Ritmine Uyum Sağla',
    slug: 'zamansiz-deri-koleksiyonu',
    description: 'İstanbul’da tasarlanan, ustaların elinde tamamlanan yeni sezon deri parçaları.',
    imageUrl: '/showcase/hero-autumn.jpg',
    bannerUrl: '/showcase/hero-autumn.jpg',
    ctaLabel: 'Koleksiyonu Keşfet',
    ctaUrl: '/urunler?featured=true',
    discountPercentage: 0,
    categoryId: null,
    categorySlug: null,
    placement: CAMPAIGN_PLACEMENT.Hero,
    startsAtUtc: '2026-09-01T00:00:00Z',
    endsAtUtc: '2027-03-01T00:00:00Z',
    isActive: true,
    displayOrder: 1,
  },
];

export const SHOWCASE_BANNER_CAMPAIGN: Campaign = {
  id: -302,
  name: 'İlk Siparişe Özel %10',
  slug: 'ilk-siparise-ozel',
  description: 'VELORA10 koduyla seçili ürünlerde ilk alışverişinize özel avantaj.',
  imageUrl: '/showcase/campaign-first-order.jpg',
  bannerUrl: '/showcase/campaign-first-order.jpg',
  ctaLabel: 'Alışverişe Başla',
  ctaUrl: '/urunler',
  discountPercentage: 10,
  categoryId: null,
  categorySlug: null,
  placement: CAMPAIGN_PLACEMENT.Banner,
  startsAtUtc: '2026-09-01T00:00:00Z',
  endsAtUtc: '2027-03-01T00:00:00Z',
  isActive: true,
  displayOrder: 1,
};

interface ShowcaseProductInput {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  image: string;
  hoverImage: string;
  brand: string;
  category: string;
  rating: number;
  ratingCount: number;
  stock: number;
  featured?: boolean;
  isNew?: boolean;
  swatches: ProductListItem['swatches'];
}

function product(input: ShowcaseProductInput): ProductListItem {
  const effectivePrice = input.discountPrice ?? input.price;
  return {
    id: input.id,
    name: input.name,
    slug: input.slug,
    shortDescription: input.description,
    price: input.price,
    discountPrice: input.discountPrice ?? null,
    effectivePrice,
    discountPercentage: input.discountPrice
      ? Math.round((1 - input.discountPrice / input.price) * 100)
      : 0,
    primaryImageUrl: `/showcase/${input.image}`,
    hoverImageUrl: `/showcase/${input.hoverImage}`,
    brandName: input.brand,
    brandSlug: null,
    categoryName: input.category,
    categorySlug: null,
    ratingAverage: input.rating,
    ratingCount: input.ratingCount,
    totalStock: input.stock,
    inStock: input.stock > 0,
    isFeatured: input.featured ?? false,
    isNew: input.isNew ?? false,
    tags: [],
    swatches: input.swatches,
  };
}

function category(
  id: number,
  name: string,
  slug: string,
  image: string,
  productCount: number,
): Category {
  return {
    id,
    name,
    slug,
    description: `${name} koleksiyonunu keşfedin.`,
    parentId: null,
    imageUrl: `/showcase/${image}`,
    displayOrder: Math.abs(id) - 200,
    isActive: true,
    isFeatured: true,
    metaTitle: null,
    metaDescription: null,
    productCount,
    children: [],
  };
}
