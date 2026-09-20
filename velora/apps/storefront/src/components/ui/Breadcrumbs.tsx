import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';

export interface Crumb {
  name: string;
  /** Omitted on the last crumb — the current page is not a link. */
  href?: string;
}

/**
 * Navigation trail above a page title.
 *
 * The matching BreadcrumbList JSON-LD is emitted by the page's <Seo>, not here:
 * structured data belongs with the rest of a page's head content, and duplicating
 * it in the visual component would put two lists on the same page.
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <nav aria-label={t('nav.breadcrumb')} className={cn('text-2xs', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-ink-400">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.name}-${index}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link to={item.href} className="uppercase tracking-label transition-colors hover:text-ink-900">
                  {item.name}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className="uppercase tracking-label text-ink-600">
                  {item.name}
                </span>
              )}

              {!isLast && <ChevronRight aria-hidden className="h-3 w-3 text-ink-300" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
