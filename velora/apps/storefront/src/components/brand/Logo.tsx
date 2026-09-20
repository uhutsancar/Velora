import { Link } from 'react-router-dom';
import { VeloraMark } from '@velora/shared/brand';
import { cn } from '@/utils/cn';

export { VeloraMark };

export interface LogoProps {
  /** `full` pairs the seal with the wordmark; `mark` is the seal alone. */
  variant?: 'full' | 'mark' | 'wordmark';
  className?: string;
  markClassName?: string;
  /** Wraps the logo in a link, normally to the home page. */
  to?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

/**
 * Storefront lockup: the shared seal plus the wordmark.
 *
 * The letter-spacing pushes the last glyph off centre, so an equal text-indent
 * puts the optical centre back where the box centre is.
 */
export function Logo({
  variant = 'full',
  className,
  markClassName,
  to,
  onClick,
  ariaLabel = 'Velora',
}: LogoProps) {
  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {variant !== 'wordmark' && <VeloraMark className={cn('h-7 w-7 shrink-0', markClassName)} />}
      {variant !== 'mark' && (
        <span className="font-display text-xl leading-none tracking-[0.26em] [text-indent:0.26em]">
          VELORA
        </span>
      )}
    </span>
  );

  if (to) {
    return (
      <Link to={to} onClick={onClick} aria-label={ariaLabel} className="shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}
