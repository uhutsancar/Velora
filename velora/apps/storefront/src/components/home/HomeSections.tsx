import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, PackageCheck, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Campaign, Category } from '@velora/shared';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion/Reveal';
import { SectionHeading } from '@/components/ui/Display';
import { Skeleton } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { mediaUrl } from '@/utils/media';
import { cn } from '@/utils/cn';

/** Editorial category tiles. The first tile spans two columns on desktop. */
export function CategoryShowcase({ categories, loading }: { categories: Category[]; loading?: boolean }) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <section className="container-velora py-16 md:py-24">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className={cn('aspect-editorial', index === 0 && 'md:col-span-2')} />
          ))}
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="container-velora py-16 md:py-24">
      <Reveal>
        <SectionHeading
          eyebrow={t('home.categories')}
          title={t('home.categoriesSubtitle')}
          align="center"
        />
      </Reveal>

      <StaggerGroup className="mt-12 grid gap-4 md:grid-cols-4">
        {categories.slice(0, 4).map((category, index) => (
          <StaggerItem key={category.id} className={cn(index === 0 && 'md:col-span-2 md:row-span-1')}>
            <Link
              to={`/kategori/${category.slug}`}
              className="group relative block h-full overflow-hidden bg-sand-200"
            >
              <div className={cn('aspect-editorial', index === 0 && 'md:aspect-[16/11]')}>
                <img
                  src={mediaUrl(category.imageUrl) ?? ''}
                  alt={category.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-[900ms] ease-velora group-hover:scale-105"
                />
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-ink-950/10 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-6">
                <div>
                  <h3 className="font-display text-2xl text-sand-50">{category.name}</h3>
                  {category.productCount > 0 && (
                    <p className="mt-1 text-xs text-sand-100/70">
                      {t('common.productCount', { count: category.productCount })}
                    </p>
                  )}
                </div>

                <ArrowUpRight className="h-5 w-5 shrink-0 text-sand-50 transition-transform duration-300 ease-velora group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
            </Link>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}

/**
 * Sticky editorial block: the image pins while the copy scrolls past it.
 * One instance per page — used sparingly so it stays a moment, not a gimmick.
 */
export function EditorialSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);

  return (
    <section ref={sectionRef} className="bg-ink-900 py-20 text-sand-50 md:py-32">
      <div className="container-velora grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
        <div className="relative aspect-editorial overflow-hidden lg:sticky lg:top-28">
          <motion.img
            src="https://picsum.photos/seed/velora-editorial/1200/1500"
            alt={t('home.editorialImageAlt')}
            loading="lazy"
            decoding="async"
            style={reduceMotion ? undefined : { scale: imageScale }}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="space-y-8">
          <Reveal>
            <p className="label-caps text-tan-300">{t('home.editorialTitle')}</p>
            <h2 className="mt-4 font-display text-headline text-sand-50 text-balance">
              {t('common.tagline')}
            </h2>
            <p className="mt-6 text-base leading-relaxed text-sand-100/75 text-pretty">
              {t('home.editorialBody')}
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <dl className="grid gap-8 border-t border-white/10 pt-8 sm:grid-cols-3">
              {[
                { value: '40+', label: t('home.statSteps') },
                { value: '1994', label: t('home.statFounded') },
                { value: '%100', label: t('home.statLeather') },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="font-display text-3xl text-sand-50">{stat.value}</dt>
                  <dd className="mt-1 text-xs uppercase tracking-label text-sand-100/60">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={0.2}>
            <Button to="/atolye" variant="outline" className="border-sand-50 text-sand-50 hover:bg-sand-50 hover:text-ink-900">
              {t('home.exploreAtelier')}
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const VALUE_PROPS = [
  { icon: PackageCheck, titleKey: 'home.valueQuality', bodyKey: 'home.valueQualityBody' },
  { icon: Truck, titleKey: 'home.valueShipping', bodyKey: 'home.valueShippingBody' },
  { icon: RotateCcw, titleKey: 'home.valueReturn', bodyKey: 'home.valueReturnBody' },
  { icon: ShieldCheck, titleKey: 'home.valueWarranty', bodyKey: 'home.valueWarrantyBody' },
] as const;

export function ValueProps() {
  const { t } = useTranslation();

  return (
    <section className="border-y border-ink-100 bg-sand-100">
      <StaggerGroup className="container-velora grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {VALUE_PROPS.map(({ icon: Icon, titleKey, bodyKey }) => (
          <StaggerItem key={titleKey} className="flex gap-4">
            <Icon className="h-6 w-6 shrink-0 text-tan-600" aria-hidden />
            <div>
              <h3 className="label-caps text-ink-900">{t(titleKey)}</h3>
              <p className="mt-1.5 text-sm text-ink-500">{t(bodyKey)}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}

/** Wide promotional banner sourced from Banner-placement campaigns. */
export function CampaignBanner({ campaign }: { campaign?: Campaign }) {
  const { t } = useTranslation();

  if (!campaign) return null;

  return (
    <section className="container-velora py-8">
      <Reveal>
        <Link
          to={campaign.ctaUrl ?? `/kampanyalar/${campaign.slug}`}
          className="group relative block overflow-hidden"
        >
          <div className="aspect-[21/9] md:aspect-[21/6]">
            <img
              src={mediaUrl(campaign.bannerUrl ?? campaign.imageUrl) ?? ''}
              alt={campaign.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-[900ms] ease-velora group-hover:scale-[1.03]"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/75 via-ink-950/35 to-transparent" />

          <div className="absolute inset-y-0 left-0 flex max-w-lg flex-col justify-center p-8 md:p-14">
            {campaign.discountPercentage > 0 && (
              <p className="label-caps mb-3 text-tan-300">
                {t('product.discount', { value: campaign.discountPercentage })}
              </p>
            )}
            <h2 className="font-display text-headline text-sand-50 text-balance">{campaign.name}</h2>
            {campaign.description && (
              <p className="mt-3 text-sm text-sand-100/80 text-pretty">{campaign.description}</p>
            )}
            <span className="label-caps mt-6 inline-flex items-center gap-2 text-sand-50">
              {campaign.ctaLabel ?? t('common.discover')}
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
            </span>
          </div>
        </Link>
      </Reveal>
    </section>
  );
}
