import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Category } from '@velora/shared';
import { mediaUrl } from '@/utils/media';

export interface MegaMenuProps {
  categories: Category[];
  openCategoryId: number | null;
  onClose: () => void;
}

/**
 * Desktop dropdown. Rendered inside the header so it inherits the sticky context
 * and closes when the pointer leaves the header region.
 */
export function MegaMenu({ categories, openCategoryId, onClose }: MegaMenuProps) {
  const { t } = useTranslation();

  const category = categories.find((item) => item.id === openCategoryId);
  const hasContent = Boolean(category && (category.children.length > 0 || category.imageUrl));

  return (
    <AnimatePresence>
      {category && hasContent && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-0 top-full hidden border-b border-ink-100 bg-sand-50 shadow-card lg:block"
        >
          <div className="container-velora grid grid-cols-12 gap-10 py-10">
            <div className="col-span-3">
              <p className="label-caps mb-4 text-ink-400">{category.name}</p>

              <ul className="space-y-2.5">
                <li>
                  <Link
                    to={`/kategori/${category.slug}`}
                    onClick={onClose}
                    className="link-underline text-sm font-medium text-ink-900"
                  >
                    {t('common.all')} {category.name}
                  </Link>
                </li>

                {category.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      to={`/kategori/${child.slug}`}
                      onClick={onClose}
                      className="link-underline flex items-baseline gap-2 text-sm text-ink-600 transition-colors hover:text-ink-900"
                    >
                      {child.name}
                      {child.productCount > 0 && (
                        <span className="text-2xs text-ink-300">{child.productCount}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-4">
              <p className="label-caps mb-4 text-ink-400">{t('nav.highlights')}</p>

              <ul className="space-y-2.5 text-sm text-ink-600">
                <li>
                  <Link
                    to={`/urunler?category=${category.slug}&onSale=true`}
                    onClick={onClose}
                    className="link-underline transition-colors hover:text-ink-900"
                  >
                    {t('catalog.onSale')}
                  </Link>
                </li>
                <li>
                  <Link
                    to={`/urunler?category=${category.slug}&sort=0`}
                    onClick={onClose}
                    className="link-underline transition-colors hover:text-ink-900"
                  >
                    {t('home.newArrivals')}
                  </Link>
                </li>
                <li>
                  <Link
                    to={`/urunler?category=${category.slug}&sort=4`}
                    onClick={onClose}
                    className="link-underline transition-colors hover:text-ink-900"
                  >
                    {t('home.bestSellers')}
                  </Link>
                </li>
              </ul>
            </div>

            {category.imageUrl && (
              <div className="col-span-5">
                <Link
                  to={`/kategori/${category.slug}`}
                  onClick={onClose}
                  className="group relative block aspect-[16/9] overflow-hidden bg-sand-200"
                >
                  <img
                    src={mediaUrl(category.imageUrl) ?? ''}
                    alt={category.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 ease-velora group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent" />
                  <div className="absolute bottom-5 left-5 flex items-center gap-2 text-sand-50">
                    <span className="font-display text-xl">{category.name}</span>
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </div>
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
