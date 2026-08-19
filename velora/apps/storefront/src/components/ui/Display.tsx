import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, localeFor } from '@velora/shared';
import { env } from '@/config/env';
import { cn } from '@/utils/cn';

/** Formats money with the active locale — never hard-code the currency in a component. */
export function Price({
  value,
  className,
  size = 'md',
}: {
  value: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { i18n } = useTranslation();

  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' };

  return (
    <span className={cn('font-medium tabular-nums', sizes[size], className)}>
      {formatCurrency(value, localeFor(i18n.language), env.currency)}
    </span>
  );
}

export function PriceBlock({
  price,
  discountPrice,
  size = 'md',
  className,
}: {
  price: number;
  discountPrice?: number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const hasDiscount = discountPrice != null && discountPrice > 0 && discountPrice < price;

  return (
    <span className={cn('flex items-baseline gap-2', className)}>
      <Price value={hasDiscount ? discountPrice : price} size={size} className={hasDiscount ? 'text-wine-500' : undefined} />
      {hasDiscount && (
        <Price value={price} size="sm" className="font-normal text-ink-400 line-through" />
      )}
    </span>
  );
}

export function Badge({
  children,
  variant = 'neutral',
  className,
}: {
  children: React.ReactNode;
  variant?: 'neutral' | 'sale' | 'new' | 'soldout' | 'success';
  className?: string;
}) {
  const variants = {
    neutral: 'bg-ink-900/90 text-sand-50',
    sale: 'bg-wine-600 text-white',
    new: 'bg-tan-500 text-white',
    soldout: 'bg-ink-200 text-ink-600',
    success: 'bg-moss-500 text-white',
  };

  return (
    <span className={cn('label-caps px-2 py-1 leading-none', variants[variant], className)}>
      {children}
    </span>
  );
}

export function Rating({
  value,
  count,
  size = 'sm',
  showCount = true,
  className,
}: {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  showCount?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const starSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div
      className={cn('flex items-center gap-1.5', className)}
      // One accessible label beats five decorative icons being read out.
      aria-label={`${value.toFixed(1)} / 5`}
    >
      <div className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              starSize,
              star <= Math.round(value) ? 'fill-tan-500 text-tan-500' : 'text-ink-200',
            )}
          />
        ))}
      </div>

      {showCount && count != null && (
        <span className="text-xs text-ink-400">{t('product.reviewCount', { count })}</span>
      )}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 md:flex-row md:items-end md:justify-between',
        align === 'center' && 'items-center text-center md:flex-col md:items-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && <p className="label-caps mb-2 text-tan-600">{eyebrow}</p>}
        <h2 className="text-headline text-balance">{title}</h2>
        {description && <p className="mt-3 text-sm text-ink-500 text-pretty">{description}</p>}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
