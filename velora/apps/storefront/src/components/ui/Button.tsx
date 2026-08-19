import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink-900 text-sand-50 hover:bg-ink-800 active:bg-ink-950 disabled:bg-ink-300',
  secondary: 'bg-tan-500 text-white hover:bg-tan-600 active:bg-tan-700 disabled:bg-tan-200',
  outline:
    'border border-ink-900 text-ink-900 hover:bg-ink-900 hover:text-sand-50 disabled:border-ink-200 disabled:text-ink-300',
  ghost: 'text-ink-800 hover:bg-ink-100 active:bg-ink-200 disabled:text-ink-300',
  link: 'text-ink-900 underline-offset-4 hover:underline p-0 h-auto',
  danger: 'bg-wine-600 text-white hover:bg-wine-500 disabled:bg-wine-600/40',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-xs tracking-wide',
  md: 'h-11 px-6 text-sm',
  lg: 'h-14 px-8 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Renders a react-router Link that looks identical to the button. */
  to?: string;
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-none font-medium uppercase tracking-label ' +
  'transition-all duration-300 ease-velora disabled:cursor-not-allowed ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tan-500 focus-visible:ring-offset-2';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    to,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const classes = cn(
    BASE,
    VARIANTS[variant],
    variant !== 'link' && SIZES[size],
    fullWidth && 'w-full',
    className,
  );

  const content = (
    <>
      {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-disabled={disabled}>
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      // A loading button must not be clickable twice.
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {content}
    </button>
  );
});
