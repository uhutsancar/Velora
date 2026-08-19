import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { pushToast, type ToastVariant } from '@/store/slices/uiSlice';
import { selectAuthUser, selectIsAuthenticated } from '@/store/slices/authSlice';

/** Delays a rapidly changing value — used for search-as-you-type. */
export function useDebounce<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(media.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

/** Tailwind's lg breakpoint, so JS and CSS agree on what "desktop" means. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** Direction + offset of the last scroll, used to hide/show the sticky header. */
export function useScrollDirection(threshold = 8) {
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;

      ticking.current = true;

      // rAF keeps the handler off the scroll critical path.
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;

        setScrolled(currentY > 24);

        if (Math.abs(currentY - lastY.current) >= threshold) {
          setDirection(currentY > lastY.current && currentY > 120 ? 'down' : 'up');
          lastY.current = currentY;
        }

        ticking.current = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return { direction, scrolled };
}

/** Locks background scrolling while a drawer or modal is open. */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return undefined;

    const { body } = document;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Compensating for the scrollbar prevents the layout shift on open.
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    body.classList.add('scroll-locked');

    return () => {
      body.classList.remove('scroll-locked');
      body.style.paddingRight = previousPaddingRight;
    };
  }, [locked]);
}

export function useToast() {
  const dispatch = useAppDispatch();

  return useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      dispatch(pushToast(message, variant));
    },
    [dispatch],
  );
}

export function useAuth() {
  const user = useAppSelector(selectAuthUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return { user, isAuthenticated };
}

/** Calls `onClose` on outside click and on Escape. */
export function useDismissable<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, onClose]);

  return ref;
}
