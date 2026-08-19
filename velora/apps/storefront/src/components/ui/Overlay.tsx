import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/hooks';
import { cn } from '@/utils/cn';

const BACKDROP = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const EASE = [0.22, 1, 0.36, 1] as const;

interface OverlayShellProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}

/**
 * Shared backdrop + focus management for Drawer and Modal.
 * Traps focus inside the panel and restores it to the trigger on close.
 */
function OverlayShell({ open, onClose, labelledBy, children }: OverlayShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    panel?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );

      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
          <motion.div
            {...BACKDROP}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px]"
          />
          <div ref={panelRef} tabIndex={-1} className="relative h-full outline-none">
            {children}
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: 'right' | 'left';
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Drawer({ open, onClose, title, side = 'right', children, footer, className }: DrawerProps) {
  const titleId = `drawer-title-${side}`;

  return (
    <OverlayShell open={open} onClose={onClose} labelledBy={titleId}>
      <motion.aside
        initial={{ x: side === 'right' ? '100%' : '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: side === 'right' ? '100%' : '-100%' }}
        transition={{ duration: 0.4, ease: EASE }}
        className={cn(
          'absolute top-0 flex h-full w-[min(28rem,100vw)] flex-col bg-sand-50 shadow-drawer',
          side === 'right' ? 'right-0' : 'left-0',
          className,
        )}
      >
        <header className="flex items-center justify-between border-b border-ink-100 px-6 py-5">
          <h2 id={titleId} className="label-caps text-ink-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="text-ink-500 transition-colors hover:text-ink-900"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {footer && <footer className="border-t border-ink-100 bg-white px-6 py-5">{footer}</footer>}
      </motion.aside>
    </OverlayShell>
  );
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const MODAL_SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
};

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const titleId = 'modal-title';

  return (
    <OverlayShell open={open} onClose={onClose} labelledBy={titleId}>
      <div className="flex h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.3, ease: EASE }}
          className={cn(
            'flex max-h-[85vh] w-full flex-col bg-sand-50 shadow-lifted',
            MODAL_SIZES[size],
          )}
        >
          <header className="flex items-center justify-between border-b border-ink-100 px-6 py-5">
            <h2 id={titleId} className="font-display text-title text-ink-900">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="text-ink-500 transition-colors hover:text-ink-900"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {footer && <footer className="border-t border-ink-100 px-6 py-4">{footer}</footer>}
        </motion.div>
      </div>
    </OverlayShell>
  );
}
