import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';

/**
 * Payment marks in the footer.
 *
 * Drawn inline as monochrome wordmarks rather than loaded as brand logos: card
 * schemes licence their marks, the coloured versions fight the ink footer, and
 * five more image requests at the bottom of every page buys nothing. They are
 * decorative, so the list carries one accessible label and the tiles are hidden
 * from the accessibility tree.
 */
const METHODS = ['VISA', 'MASTERCARD', 'TROY', 'AMEX'] as const;

export function PaymentMethods({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <ul aria-label={t('checkout.payment')} className={cn('flex flex-wrap items-center gap-2', className)}>
      {METHODS.map((method) => (
        <li
          key={method}
          aria-hidden
          className="border border-white/15 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-sand-100/55"
        >
          {method}
        </li>
      ))}

      <li
        aria-hidden
        className="border border-white/15 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-sand-100/55"
      >
        3D Secure
      </li>
    </ul>
  );
}
