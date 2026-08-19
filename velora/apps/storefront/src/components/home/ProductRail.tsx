import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProductListItem } from '@velora/shared';
import { ProductCard } from '@/components/product/ProductCard';
import { SectionHeading } from '@/components/ui/Display';
import { ProductCardSkeleton } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/motion/Reveal';
import { cn } from '@/utils/cn';

export interface ProductRailProps {
  eyebrow?: string;
  title: string;
  description?: string;
  products: ProductListItem[];
  loading?: boolean;
  viewAllHref?: string;
  viewAllLabel?: string;
}

/**
 * Horizontal product rail.
 *
 * Uses native scroll-snap rather than a carousel library: it keeps momentum
 * scrolling on touch, needs no JS on mobile, and ships zero extra bytes.
 */
export function ProductRail({
  eyebrow,
  title,
  description,
  products,
  loading = false,
  viewAllHref,
  viewAllLabel = 'Tümünü gör',
}: ProductRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const syncArrows = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    setCanScrollLeft(rail.scrollLeft > 8);
    setCanScrollRight(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 8);
  }, []);

  useEffect(() => {
    syncArrows();

    const rail = railRef.current;
    if (!rail) return undefined;

    rail.addEventListener('scroll', syncArrows, { passive: true });
    window.addEventListener('resize', syncArrows);

    return () => {
      rail.removeEventListener('scroll', syncArrows);
      window.removeEventListener('resize', syncArrows);
    };
  }, [syncArrows, products.length]);

  const scrollBy = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;

    // Scroll by roughly one viewport of cards.
    rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: 'smooth' });
  };

  if (!loading && products.length === 0) return null;

  return (
    <section className="container-velora py-16 md:py-24">
      <Reveal>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          action={
            <div className="flex items-center gap-3">
              {viewAllHref && (
                <Button to={viewAllHref} variant="link" className="label-caps">
                  {viewAllLabel}
                </Button>
              )}

              <div className="hidden gap-2 md:flex">
                <RailButton
                  direction="left"
                  disabled={!canScrollLeft}
                  onClick={() => scrollBy(-1)}
                />
                <RailButton
                  direction="right"
                  disabled={!canScrollRight}
                  onClick={() => scrollBy(1)}
                />
              </div>
            </div>
          }
        />
      </Reveal>

      <div ref={railRef} className="scroll-rail mt-10 -mx-5 gap-5 px-5 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        {loading
          ? Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="w-[70vw] shrink-0 snap-start sm:w-[42vw] lg:w-[23vw]">
                <ProductCardSkeleton />
              </div>
            ))
          : products.map((product, index) => (
              <div key={product.id} className="w-[70vw] shrink-0 snap-start sm:w-[42vw] lg:w-[23vw]">
                <ProductCard product={product} priority={index < 2} />
              </div>
            ))}
      </div>
    </section>
  );
}

function RailButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Önceki ürünler' : 'Sonraki ürünler'}
      className={cn(
        'flex h-10 w-10 items-center justify-center border border-ink-200 text-ink-700 transition-all duration-200',
        'hover:border-ink-900 hover:text-ink-900 disabled:opacity-30 disabled:hover:border-ink-200',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
