import { useTranslation } from 'react-i18next';
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from '@velora/shared';
import { Hero } from '@/components/home/Hero';
import { ProductRail } from '@/components/home/ProductRail';
import { CampaignBanner, CategoryShowcase, EditorialSection, ValueProps } from '@/components/home/HomeSections';
import { Seo } from '@/components/seo/Seo';
import { env } from '@/config/env';
import {
  SHOWCASE_BANNER_CAMPAIGN,
  SHOWCASE_CATEGORIES,
  SHOWCASE_HERO_CAMPAIGNS,
  SHOWCASE_PRODUCTS,
} from '@/content/showcase';
import {
  useGetBestSellersQuery,
  useGetCampaignsQuery,
  useGetFeaturedCategoriesQuery,
  useGetFeaturedProductsQuery,
  useGetNewArrivalsQuery,
} from '@/store/api/catalogApi';

export default function HomePage() {
  const { t } = useTranslation();

  const { data: heroCampaigns = [] } = useGetCampaignsQuery({ placement: 'Hero' });
  const { data: bannerCampaigns = [] } = useGetCampaignsQuery({ placement: 'Banner' });
  const { data: categories = [] } = useGetFeaturedCategoriesQuery();
  const { data: featured = [] } = useGetFeaturedProductsQuery(8);
  const { data: newArrivals = [] } = useGetNewArrivalsQuery(8);
  const { data: bestSellers = [] } = useGetBestSellersQuery(8);

  const heroItems = heroCampaigns.length > 0 ? heroCampaigns : SHOWCASE_HERO_CAMPAIGNS;
  const categoryItems = categories.length > 0 ? categories : SHOWCASE_CATEGORIES;
  const featuredItems = featured.length > 0 ? featured : SHOWCASE_PRODUCTS;
  const newItems = newArrivals.length > 0 ? newArrivals : [...SHOWCASE_PRODUCTS].reverse();
  const bestSellerItems = bestSellers.length > 0
    ? bestSellers
    : [SHOWCASE_PRODUCTS[4], SHOWCASE_PRODUCTS[0], SHOWCASE_PRODUCTS[2], ...SHOWCASE_PRODUCTS.slice(5)].filter(
        (product): product is (typeof SHOWCASE_PRODUCTS)[number] => Boolean(product),
      );

  return (
    <>
      <Seo
        title={`${env.siteName} — ${t('common.tagline')}`}
        description={t('home.metaDescription')}
        path="/"
        jsonLd={[
          buildOrganizationJsonLd(env.siteUrl, env.siteName),
          buildWebsiteJsonLd(env.siteUrl, env.siteName),
        ]}
      />

      <Hero campaigns={heroItems} />

      <ValueProps />

      <ProductRail
        eyebrow={t('home.featured')}
        title={t('home.featuredSubtitle')}
        products={featuredItems}
        viewAllHref="/urunler?featured=true"
      />

      <CategoryShowcase categories={categoryItems} />

      <CampaignBanner campaign={bannerCampaigns[0] ?? SHOWCASE_BANNER_CAMPAIGN} />

      <ProductRail
        eyebrow={t('home.newArrivals')}
        title={t('home.newArrivalsSubtitle')}
        products={newItems}
        viewAllHref="/urunler?sort=0"
      />

      <EditorialSection />

      <ProductRail
        eyebrow={t('home.bestSellers')}
        title={t('home.bestSellersSubtitle')}
        products={bestSellerItems}
        viewAllHref="/urunler?sort=4"
      />
    </>
  );
}
