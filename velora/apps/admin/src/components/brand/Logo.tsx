import { VeloraMark } from '@velora/shared/brand';
import { cn } from '@/utils/cn';

export interface AdminLogoProps {
  /** `mark` drops the wordmark, for the collapsed navigation rail. */
  variant?: 'full' | 'mark';
  className?: string;
}

/**
 * Back-office lockup: the shared seal, the wordmark and a console tag.
 *
 * The tag matters more than it looks. Storefront and admin share an origin in
 * production, and two tabs of the same brand with the same header is how an
 * operator ends up editing live prices in the tab they thought was the shop.
 */
export function AdminLogo({ variant = 'full', className }: AdminLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-ink-900', className)}>
      <VeloraMark className="h-7 w-7 shrink-0" title={variant === 'mark' ? 'Velora Admin' : undefined} />

      {variant === 'full' && (
        <>
          <span className="font-display text-lg leading-none tracking-[0.22em] [text-indent:0.22em]">
            VELORA
          </span>

          <span className="border border-ink-200 px-1.5 py-0.5 text-[9px] font-medium uppercase leading-none tracking-[0.14em] text-ink-400">
            Admin
          </span>
        </>
      )}
    </span>
  );
}
