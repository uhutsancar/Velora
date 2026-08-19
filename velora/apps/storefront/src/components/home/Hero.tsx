import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Campaign } from '@velora/shared';
import { TextReveal } from '@/components/motion/Reveal';
import { Skeleton } from '@/components/ui/Feedback';
import { mediaUrl } from '@/utils/media';
import { cn } from '@/utils/cn';

const SLIDE_DURATION_MS = 7000;

export interface HeroProps {
  campaigns: Campaign[];
  loading?: boolean;
}

/**
 * Full-bleed hero carousel driven by the Hero-placement campaigns coming from
 * CatalogService. Falls back to a static editorial slide when none are live.
 */
export function Hero({ campaigns, loading = false }: HeroProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end start'] });

  // The image drifts slower than the page: depth without a jarring parallax.
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const slides = campaigns.length > 0 ? campaigns : [];

  useEffect(() => {
    if (slides.length < 2) return undefined;

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setIndex((current) => (current + 1) % slides.length);
      }
    }, SLIDE_DURATION_MS);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (loading) {
    return <Skeleton className="h-[72vh] min-h-[520px] w-full" />;
  }

  const slide = slides[index];

  return (
    <section
      ref={containerRef}
      className="relative h-[82vh] min-h-[560px] w-full overflow-hidden bg-ink-900"
      aria-label={t('home.heroTitle')}
    >
      {slide ? (
        <motion.div style={reduceMotion ? undefined : { y: imageY }} className="absolute inset-0 -bottom-[18%]">
          {slides.map((item, slideIndex) => (
            <motion.img
              key={item.id}
              src={mediaUrl(item.bannerUrl ?? item.imageUrl) ?? ''}
              alt={item.name}
              // Only the first slide is an LCP candidate.
              loading={slideIndex === 0 ? 'eager' : 'lazy'}
              {...{ fetchpriority: slideIndex === 0 ? 'high' : 'low' }}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
              initial={false}
              animate={{ opacity: slideIndex === index ? 1 : 0, scale: slideIndex === index ? 1 : 1.06 }}
              transition={{ opacity: { duration: 1 }, scale: { duration: 8, ease: 'linear' } }}
            />
          ))}
        </motion.div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/30 to-ink-950/40" />

      <motion.div
        style={reduceMotion ? undefined : { opacity: contentOpacity }}
        className="container-velora relative flex h-full flex-col justify-end pb-20 md:justify-center md:pb-0"
      >
        <div className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="label-caps mb-4 text-tan-300"
          >
            {slide?.description ? t('home.heroEyebrow') : t('home.heroEyebrow')}
          </motion.p>

          <h1 className="text-display text-sand-50 text-balance">
            <TextReveal text={slide?.name ?? t('home.heroTitle')} delay={0.15} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-6 max-w-lg text-base leading-relaxed text-sand-100/85 text-pretty"
          >
            {slide?.description ?? t('home.heroSubtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65 }}
            className="mt-10"
          >
            <Link
              to={slide?.ctaUrl ?? '/urunler'}
              className="group inline-flex items-center gap-3 border-b border-sand-50 pb-2 text-sand-50"
            >
              <span className="label-caps">{slide?.ctaLabel ?? t('home.heroCta')}</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-velora group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        {slides.length > 1 && (
          <div className="absolute bottom-8 right-5 flex gap-2 sm:right-8 lg:right-12">
            {slides.map((item, slideIndex) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(slideIndex)}
                aria-label={`${slideIndex + 1}. kampanya`}
                aria-current={slideIndex === index}
                className={cn(
                  'h-0.5 transition-all duration-500 ease-velora',
                  slideIndex === index ? 'w-12 bg-sand-50' : 'w-6 bg-sand-50/40 hover:bg-sand-50/70',
                )}
              />
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}
