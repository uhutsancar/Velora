import { Suspense, useEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { Spinner, ToastViewport } from '@/components/ui/Feedback';
import { useAppDispatch } from '@/store/hooks';
import { closeAllOverlays } from '@/store/slices/uiSlice';
import { CartDrawer } from './CartDrawer';
import { Footer } from './Footer';
import { Header } from './Header';
import { MobileMenu } from './MobileMenu';
import { SearchOverlay } from './SearchOverlay';

export function Layout() {
  const dispatch = useAppDispatch();
  const location = useLocation();

  // Navigating with a drawer open would leave it floating over the new page.
  useEffect(() => {
    dispatch(closeAllOverlays());
  }, [location.pathname, dispatch]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sand-50"
      >
        İçeriğe geç
      </a>

      <Header />

      <main id="main" className="flex-1">
        {/* Route-level chunks stream in behind this boundary. */}
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center">
              <Spinner className="h-8 w-8" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      <Footer />

      <CartDrawer />
      <MobileMenu />
      <SearchOverlay />
      <ToastViewport />

      <ScrollRestoration />
    </div>
  );
}
