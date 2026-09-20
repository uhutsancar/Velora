import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface DisclosureProps {
  title: string;
  children: ReactNode;
  /** Open on first render — used for the first row of an FAQ group. */
  defaultOpen?: boolean;
  /** Small right-aligned hint, e.g. a delivery estimate next to "Shipping". */
  meta?: string;
  className?: string;
}

/**
 * One collapsible row.
 *
 * Built on a real <button> with aria-expanded and aria-controls rather than a
 * <details> element: the height animation needs the panel mounted while it
 * collapses, and <details> hides its content the instant `open` flips.
 */
export function Disclosure({ title, children, defaultOpen = false, meta, className }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={cn('border-b border-ink-100', className)}>
      <h3>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-4 py-5 text-left transition-colors hover:text-ink-950"
        >
          <span className="flex-1 text-sm font-medium text-ink-900">{title}</span>
          {meta && <span className="text-2xs uppercase tracking-label text-ink-400">{meta}</span>}

          <span aria-hidden className="shrink-0 text-ink-400">
            {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-6 text-sm leading-relaxed text-ink-600 text-pretty">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Groups disclosures with a shared top border so the stack reads as one list. */
export function DisclosureGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('border-t border-ink-100', className)}>{children}</div>;
}
