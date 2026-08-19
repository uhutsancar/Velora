import { PackageSearch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ProductListItem } from '@velora/shared';
import { EmptyState, ProductCardSkeleton } from '@/components/ui/Feedback';
import { StaggerGroup, StaggerItem } from '@/components/motion/Reveal';
import { cn } from '@/utils/cn';
import { ProductCard } from './ProductCard';

export interface ProductGridProps {
  products: ProductListItem[];
  loading?: boolean;
  skeletonCount?: number;
  columns?: 2 | 3 | 4;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  className?: string;
}

const COLUMN_CLASSES: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
};

export function ProductGrid({
  products,
  loading = false,
  skeletonCount = 8,
  columns = 4,
  emptyTitle,
  emptyDescription,
  emptyAction,
  className,
}: ProductGridProps) {
  const { t } = useTranslation();

  if (loading && products.length === 0) {
    return (
      <div className={cn('grid gap-x-5 gap-y-10', COLUMN_CLASSES[columns], className)}>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<PackageSearch className="h-10 w-10" />}
        title={emptyTitle ?? t('catalog.noResults')}
        description={emptyDescription ?? t('catalog.noResultsBody')}
        action={emptyAction}
      />
    );
  }

  return (
    <StaggerGroup className={cn('grid gap-x-5 gap-y-10', COLUMN_CLASSES[columns], className)}>
      {products.map((product, index) => (
        <StaggerItem key={product.id}>
          {/* The first row is the LCP candidate, so those images load eagerly. */}
          <ProductCard product={product} priority={index < columns} />
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}
