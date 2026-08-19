import { useTranslation } from 'react-i18next';
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from '@velora/shared';
import { Hero } from '@/components/home/Hero';
import { ProductRail } from '@/components/home/ProductRail';
import { CampaignBanner, CategoryShowcase, EditorialSection, ValueProps } from '@/components/home/HomeSections';
import { Seo } from '@/components/seo/Seo';
import { env } from '@/config/env';
import {
  useGetBestSellersQuery,
  useGetCampaignsQuery,
  useGetFeaturedCategoriesQuery,
  useGetFeaturedProductsQuery,
  useGetNewArrivalsQuery,
} from '@/store/api/catalogApi';

export default function HomePage() {
  const { t } = useTranslation();

  const { data: heroCampaigns = [], isLoading: heroLoading } = useGetCampaignsQuery({ placement: 'Hero' });
  const { data: bannerCampaigns = [] } = useGetCampaignsQuery({ placement: 'Banner' });
  const { data: categories = [], isLoading: categoriesLoading } = useGetFeaturedCategoriesQuery();
  const { data: featured = [], isLoading: featuredLoading } = useGetFeaturedProductsQuery(8);
  const { data: newArrivals = [], isLoading: newLoading } = useGetNewArrivalsQuery(8);
  const { data: bestSellers = [], isLoading: bestLoading } = useGetBestSellersQuery(8);

  return (
    <>
      <Seo
        title={`${env.siteName} — ${t('common.tagline')}`}
        description="Velora, tam tabaklanmış deriden el yapımı çanta, cüzdan ve aksesuar koleksiyonu. 500 TL üzeri ücretsiz kargo, 30 gün koşulsuz iade."
        path="/"
        jsonLd={[
          buildOrganizationJsonLd(env.siteUrl, env.siteName),
          buildWebsiteJsonLd(env.siteUrl, env.siteName),
        ]}
      />

      <Hero campaigns={heroCampaigns} loading={heroLoading} />

      <ValueProps />

      <ProductRail
        eyebrow={t('home.featured')}
        title={t('home.featuredSubtitle')}
        products={featured}
        loading={featuredLoading}
        viewAllHref="/urunler?featured=true"
      />

      <CategoryShowcase categories={categories} loading={categoriesLoading} />

      <CampaignBanner campaign={bannerCampaigns[0]} />

      <ProductRail
        eyebrow={t('home.newArrivals')}
        title={t('home.newArrivalsSubtitle')}
        products={newArrivals}
        loading={newLoading}
        viewAllHref="/urunler?sort=0"
      />

      <EditorialSection />

      <ProductRail
        eyebrow={t('home.bestSellers')}
        title={t('home.bestSellersSubtitle')}
        products={bestSellers}
        loading={bestLoading}
        viewAllHref="/urunler?sort=4"
      />
    </>
  );
}
