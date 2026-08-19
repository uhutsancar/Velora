import { motion } from 'framer-motion';
import { useState } from 'react';
import type { ProductImage } from '@velora/shared';
import { buildSrcSet, mediaUrl, PRODUCT_PLACEHOLDER } from '@/utils/media';
import { cn } from '@/utils/cn';

export interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

/**
 * Detail-page gallery: thumbnail rail plus a main frame with a zoom-on-hover
 * transform. On mobile it degrades to a snap-scrolling strip.
 */
export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const [zooming, setZooming] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const gallery = images.length > 0 ? images : [];
  const current = gallery[active];
  const src = mediaUrl(current?.url) ?? PRODUCT_PLACEHOLDER;

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();

    setOrigin({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    });
  };

  return (
    <div className="flex flex-col-reverse gap-4 md:flex-row">
      {gallery.length > 1 && (
        <div
          className="scroll-rail gap-3 md:w-20 md:flex-col md:overflow-y-auto md:overflow-x-hidden"
          role="tablist"
          aria-label={`${productName} görselleri`}
        >
          {gallery.map((image, index) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Görsel ${index + 1}`}
              onClick={() => setActive(index)}
              className={cn(
                'aspect-product w-16 shrink-0 overflow-hidden border-2 transition-colors md:w-full',
                index === active ? 'border-ink-900' : 'border-transparent hover:border-ink-300',
              )}
            >
              <img
                src={mediaUrl(image.url) ?? PRODUCT_PLACEHOLDER}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <div
        className="relative aspect-product flex-1 overflow-hidden bg-sand-200"
        onMouseEnter={() => setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={handleMove}
      >
        <motion.img
          key={src}
          src={src}
          srcSet={buildSrcSet(src, [600, 900, 1400])}
          sizes="(min-width: 1024px) 50vw, 100vw"
          alt={current?.altText ?? productName}
          // The gallery's first image is the LCP element on the detail page.
          loading="eager"
          {...{ fetchpriority: 'high' }}
          decoding="async"
          width={800}
          height={1000}
          className="h-full w-full object-cover"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            scale: zooming ? 1.6 : 1,
          }}
          transition={{ opacity: { duration: 0.35 }, scale: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
          style={{ transformOrigin: `${origin.x}% ${origin.y}%` }}
        />
      </div>
    </div>
  );
}
