import { CheckCircle2, Compass, PackageSearch } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProductRail } from '@/components/home/ProductRail';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { SectionHeading } from '@/components/ui/Display';
import { Seo } from '@/components/seo/Seo';
import { useGetBestSellersQuery, useGetCampaignsQuery } from '@/store/api/catalogApi';
import { mediaUrl } from '@/utils/media';
import ProductListPage from './ProductListPage';

export function SearchPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const term = searchParams.get('q') ?? '';

  return (
    <ProductListPage
      title={term ? `"${term}"` : undefined}
      description={t('search.metaDescription', { term })}
      path="/arama"
    />
  );
}

export function CampaignsPage() {
  const { t } = useTranslation();
  const { data: campaigns = [], isLoading } = useGetCampaignsQuery();

  return (
    <div className="container-velora py-12 md:py-20">
      <Seo
        title={t('nav.campaigns')}
        description={t('campaign.metaDescription')}
        path="/kampanyalar"
      />

      <Reveal>
        <SectionHeading
          title={t('nav.campaigns')}
          description={t('campaign.subtitle')}
          align="center"
        />
      </Reveal>

      {isLoading ? (
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="aspect-[16/9]" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={<Compass className="h-10 w-10" />}
          title={t('campaign.emptyTitle')}
          description={t('campaign.emptyBody')}
        />
      ) : (
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {campaigns.map((campaign) => (
            <Reveal key={campaign.id}>
              <Link
                to={campaign.ctaUrl ?? '/urunler'}
                className="group relative block aspect-[16/9] overflow-hidden bg-sand-200"
              >
                <img
                  src={mediaUrl(campaign.bannerUrl ?? campaign.imageUrl) ?? ''}
                  alt={campaign.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-[900ms] ease-velora group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/75 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-7">
                  {campaign.discountPercentage > 0 && (
                    <span className="label-caps mb-2 inline-block bg-wine-600 px-2 py-1 text-white">
                      {t('product.discount', { value: campaign.discountPercentage })}
                    </span>
                  )}
                  <h2 className="font-display text-2xl text-sand-50">{campaign.name}</h2>
                  {campaign.description && (
                    <p className="mt-1.5 text-sm text-sand-100/80">{campaign.description}</p>
                  )}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrderSuccessPage() {
  const { t } = useTranslation();
  const { data: bestSellers = [] } = useGetBestSellersQuery(4);

  return (
    <>
      <Seo
        title={t('checkout.successTitle')}
        description={t('checkout.successMeta')}
        path="/siparis-alindi"
        noindex
      />

      <div className="container-velora flex flex-col items-center py-24 text-center">
        <CheckCircle2 className="h-16 w-16 text-moss-500" aria-hidden />

        <h1 className="mt-6 font-display text-headline">{t('checkout.successTitle')}</h1>

        <p className="mt-4 max-w-md text-sm text-ink-500 text-pretty">
          {t('checkout.successDetail')}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button to="/hesabim/siparisler">{t('checkout.viewOrders')}</Button>
          <Button to="/urunler" variant="outline">
            {t('cart.continueShopping')}
          </Button>
        </div>
      </div>

      {bestSellers.length > 0 && (
        <ProductRail title={t('home.bestSellers')} products={bestSellers} />
      )}
    </>
  );
}

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="container-velora">
      <Seo title={t('errors.notFound')} description={t('errors.notFoundBody')} path="/404" noindex />

      <EmptyState
        icon={<PackageSearch className="h-12 w-12" />}
        title={t('errors.notFound')}
        description={t('errors.notFoundBody')}
        action={<Button to="/">{t('errors.goHome')}</Button>}
        className="min-h-[60vh]"
      />
    </div>
  );
}
