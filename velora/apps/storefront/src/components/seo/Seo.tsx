import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { env } from '@/config/env';

export interface SeoProps {
  title: string;
  description: string;
  /** Path relative to the site root, e.g. "/urun/aurora-omuz-cantasi". */
  path?: string;
  image?: string | null;
  type?: 'website' | 'product' | 'article';
  noindex?: boolean;
  /** Structured data objects rendered as ld+json script tags. */
  jsonLd?: Array<Record<string, unknown>>;
}

/**
 * Per-route head management.
 *
 * The storefront is a Vite SPA, so these tags are applied client side. Crawlers
 * that execute JavaScript (Googlebot, Bingbot) read them correctly; if social
 * preview scraping becomes a requirement, put a prerender layer in front of the
 * static host — the tags below are already the right shape for it.
 */
export function Seo({ title, description, path = '/', image, type = 'website', noindex, jsonLd }: SeoProps) {
  const { i18n } = useTranslation();

  const canonical = `${env.siteUrl}${path}`;
  const fullTitle = title.includes(env.siteName) ? title : `${title} | ${env.siteName}`;
  const ogImage = image ?? `${env.siteUrl}/og-default.jpg`;

  return (
    <Helmet prioritizeSeoTags>
      <html lang={i18n.language} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:site_name" content={env.siteName} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content={i18n.language === 'en' ? 'en_GB' : 'tr_TR'} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Alternate language versions */}
      <link rel="alternate" hrefLang="tr" href={canonical} />
      <link rel="alternate" hrefLang="en" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />

      {jsonLd?.map((data, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}
