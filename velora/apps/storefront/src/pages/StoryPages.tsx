import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion/Reveal';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Seo } from '@/components/seo/Seo';
import { aboutPage, ateliePage, sustainabilityPage, type StoryPage } from '@/content/story';
import { pick } from '@/content/types';
import { cn } from '@/utils/cn';

/**
 * Editorial brand pages: About, Atelier, Sustainability.
 *
 * All three share one layout — full-bleed hero, lead, alternating image/text
 * chapters, a stat band and an optional timeline — because they are read as one
 * story. The differences live entirely in `content/story.ts`.
 */
function StoryLayout({ page, path, crumbLabel }: { page: StoryPage; path: string; crumbLabel: string }) {
  const { t } = useTranslation();
  const heroRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);

  return (
    <>
      <Seo title={page.metaTitle} description={page.metaDescription} path={path} type="article" />

      <section ref={heroRef} className="relative h-[58vh] min-h-[380px] w-full overflow-hidden bg-ink-900">
        <motion.img
          src={page.heroImage}
          alt={page.heroAlt}
          // This is the LCP image on these routes; it must not be lazy.
          loading="eager"
          {...{ fetchpriority: 'high' }}
          decoding="async"
          style={reduceMotion ? undefined : { y: heroY }}
          className="absolute inset-0 h-full w-full scale-110 object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/40 to-ink-950/20" />

        <div className="container-velora relative flex h-full flex-col justify-end pb-12 md:pb-16">
          <Breadcrumbs
            items={[{ name: t('nav.home'), href: '/' }, { name: crumbLabel }]}
            className="[&_a]:text-sand-100/60 [&_a:hover]:text-sand-50 [&_span]:text-sand-100/80"
          />

          <p className="label-caps mt-6 text-tan-300">{page.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-display text-sand-50 text-balance">{page.title}</h1>
        </div>
      </section>

      <section className="container-velora py-14 md:py-20">
        <Reveal>
          <p className="max-w-3xl text-lg leading-relaxed text-ink-700 text-pretty md:text-xl">{page.lead}</p>
        </Reveal>
      </section>

      {page.chapters.map((chapter, index) => (
        <section key={chapter.title} className="container-velora pb-16 md:pb-24">
          <div
            className={cn(
              'grid items-center gap-10 lg:grid-cols-2 lg:gap-16',
              // Alternate sides so the page has a rhythm rather than a column.
              index % 2 === 1 && 'lg:[&>figure]:order-2',
            )}
          >
            <figure className="relative aspect-editorial overflow-hidden bg-sand-200">
              <img
                src={chapter.image}
                alt={chapter.imageAlt}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </figure>

            <Reveal>
              <p className="label-caps text-tan-600">{chapter.eyebrow}</p>
              <h2 className="mt-3 text-headline text-balance">{chapter.title}</h2>

              {chapter.body.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 32)}
                  className="mt-5 text-base leading-relaxed text-ink-600 text-pretty"
                >
                  {paragraph}
                </p>
              ))}
            </Reveal>
          </div>
        </section>
      ))}

      {page.stats && (
        <section className="border-y border-ink-100 bg-sand-100">
          <StaggerGroup className="container-velora grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-4">
            {page.stats.map((stat) => (
              <StaggerItem key={stat.label}>
                <p className="font-display text-4xl text-ink-900">{stat.value}</p>
                <p className="mt-2 text-2xs uppercase tracking-label text-ink-500">{stat.label}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>
      )}

      {page.timeline && (
        <section className="container-velora py-16 md:py-24">
          <ol className="relative border-l border-ink-100">
            {page.timeline.map((entry) => (
              <li key={entry.year} className="relative pb-10 pl-8 last:pb-0">
                <span
                  aria-hidden
                  className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-tan-500 ring-4 ring-sand-50"
                />

                <Reveal>
                  <p className="font-display text-2xl text-ink-900">{entry.year}</p>
                  <h3 className="mt-1 text-sm font-medium text-ink-900">{entry.title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-500 text-pretty">{entry.body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>
      )}

      {page.closing && (
        <section className="bg-ink-900 py-16 text-sand-50 md:py-24">
          <div className="container-velora flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="font-display text-headline text-sand-50 text-balance">{page.closing.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-sand-100/75 text-pretty">{page.closing.body}</p>
            </div>

            <Button
              to={page.closing.ctaHref}
              variant="outline"
              className="shrink-0 border-sand-50 text-sand-50 hover:bg-sand-50 hover:text-ink-900"
            >
              {page.closing.ctaLabel}
            </Button>
          </div>
        </section>
      )}
    </>
  );
}

export function AboutPage() {
  const { t, i18n } = useTranslation();
  return <StoryLayout page={pick(aboutPage, i18n.language)} path="/hakkimizda" crumbLabel={t('nav.about')} />;
}

export function AteliePage() {
  const { t, i18n } = useTranslation();
  return <StoryLayout page={pick(ateliePage, i18n.language)} path="/atolye" crumbLabel={t('nav.atelier')} />;
}

export function SustainabilityPage() {
  const { t, i18n } = useTranslation();
  return (
    <StoryLayout
      page={pick(sustainabilityPage, i18n.language)}
      path="/surdurulebilirlik"
      crumbLabel={t('nav.sustainability')}
    />
  );
}
