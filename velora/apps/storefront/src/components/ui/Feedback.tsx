import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { dismissToast, selectToasts, type ToastVariant } from '@/store/slices/uiSlice';
import { cn } from '@/utils/cn';
import { Button } from './Button';

/** Shimmering block used while data loads. Sized by the caller. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-product w-full" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/4" />
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Yükleniyor"
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-ink-200 border-t-ink-900',
        className,
      )}
    />
  );
}

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-20 text-center', className)}>
      {icon && <div className="mb-5 text-ink-300">{icon}</div>}
      <h3 className="font-display text-title text-ink-900">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-ink-500 text-pretty">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Bir şeyler ters gitti',
  message = 'İçerik yüklenemedi. Lütfen tekrar deneyin.',
  onRetry,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={<AlertTriangle className="h-10 w-10" />}
      title={title}
      description={message}
      action={
        onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Tekrar dene
          </Button>
        )
      }
    />
  );
}

const TOAST_STYLES: Record<ToastVariant, { className: string; icon: ReactNode }> = {
  success: {
    className: 'border-moss-500 bg-moss-500 text-white',
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
  },
  error: {
    className: 'border-wine-500 bg-wine-600 text-white',
    icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
  },
  info: {
    className: 'border-ink-900 bg-ink-900 text-sand-50',
    icon: <Info className="h-4 w-4" aria-hidden />,
  },
};

const TOAST_TIMEOUT_MS = 4000;

/** Global toast stack. Rendered once in the layout. */
export function ToastViewport() {
  const toasts = useAppSelector(selectToasts);
  const dispatch = useAppDispatch();

  return (
    <div
      role="region"
      aria-label="Bildirimler"
      className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.variant];

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onAnimationComplete={() => {
                window.setTimeout(() => dispatch(dismissToast(toast.id)), TOAST_TIMEOUT_MS);
              }}
              className={cn(
                'pointer-events-auto flex items-center gap-3 border px-4 py-3 text-sm shadow-lifted',
                style.className,
              )}
            >
              {style.icon}
              <span className="flex-1">{toast.message}</span>
              <button
                type="button"
                aria-label="Bildirimi kapat"
                onClick={() => dispatch(dismissToast(toast.id))}
                className="opacity-70 transition-opacity hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
