import type { Category, ProductDetail, Review } from '../types/catalog';

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  type: 'website' | 'product' | 'article';
  noindex?: boolean;
}

const MAX_DESCRIPTION_LENGTH = 158;

export const truncateForMeta = (value: string, max = MAX_DESCRIPTION_LENGTH): string => {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;

  return `${clean.slice(0, max - 1).trimEnd()}…`;
};

export function buildProductSeo(product: ProductDetail, siteUrl: string, siteName: string): SeoMeta {
  const description =
    product.metaDescription ?? product.shortDescription ?? truncateForMeta(product.description);

  return {
    title: product.metaTitle ?? `${product.name} | ${siteName}`,
    description: truncateForMeta(description),
    canonical: `${siteUrl}/urun/${product.slug}`,
    image: product.primaryImageUrl ?? undefined,
    type: 'product',
    // Keep unpublished products out of the index even if the URL leaks.
    noindex: !product.isPublished,
  };
}

export function buildCategorySeo(category: Category, siteUrl: string, siteName: string): SeoMeta {
  return {
    title: category.metaTitle ?? `${category.name} | ${siteName}`,
    description: truncateForMeta(
      category.metaDescription ??
        category.description ??
        `${category.name} koleksiyonunu ${siteName} kalitesiyle keşfedin.`,
    ),
    canonical: `${siteUrl}/kategori/${category.slug}`,
    image: category.imageUrl ?? undefined,
    type: 'website',
  };
}

/** schema.org Product with offer + aggregate rating, so listings can show rich results. */
export function buildProductJsonLd(
  product: ProductDetail,
  siteUrl: string,
  siteName: string,
  currency = 'TRY',
  reviews: Review[] = [],
): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? truncateForMeta(product.description, 400),
    image: product.images.length > 0 ? product.images.map((image) => image.url) : undefined,
    sku: product.sku ?? String(product.id),
    brand: product.brandName ? { '@type': 'Brand', name: product.brandName } : undefined,
    category: product.categoryName ?? undefined,
    url: `${siteUrl}/urun/${product.slug}`,
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/urun/${product.slug}`,
      priceCurrency: currency,
      price: product.effectivePrice.toFixed(2),
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: siteName },
    },
  };

  if (product.ratingCount > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.ratingAverage.toFixed(1),
      reviewCount: product.ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (reviews.length > 0) {
    jsonLd.review = reviews.slice(0, 5).map((review) => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5 },
      author: { '@type': 'Person', name: review.userName },
      datePublished: review.createdAtUtc,
      name: review.title ?? undefined,
      reviewBody: review.comment,
    }));
  }

  return jsonLd;
}

export function buildBreadcrumbJsonLd(
  trail: Array<{ name: string; url: string }>,
  siteUrl: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org/',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.url}`,
    })),
  };
}

export function buildOrganizationJsonLd(siteUrl: string, siteName: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Organization',
    name: siteName,
    url: siteUrl,
    logo: `${siteUrl}/logo.svg`,
    sameAs: [],
  };
}

export function buildWebsiteJsonLd(siteUrl: string, siteName: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org/',
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/arama?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
