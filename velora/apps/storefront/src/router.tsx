import { lazy } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { RequireAuth } from '@/components/auth/RequireAuth';

/**
 * Route-level code splitting.
 *
 * The home page is bundled eagerly (it is the entry point for most sessions);
 * everything else is a separate chunk fetched on navigation.
 */
import HomePage from '@/pages/HomePage';

const ProductListPage = lazy(() => import('@/pages/ProductListPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'));
const CategoryPage = lazy(() => import('@/pages/CategoryPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));

const LoginPage = lazy(() => import('@/pages/AuthPages').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/AuthPages').then((m) => ({ default: m.RegisterPage })));

const AccountLayout = lazy(() => import('@/pages/AccountPages').then((m) => ({ default: m.AccountLayout })));
const ProfilePage = lazy(() => import('@/pages/AccountPages').then((m) => ({ default: m.ProfilePage })));
const SecurityPage = lazy(() => import('@/pages/AccountPages').then((m) => ({ default: m.SecurityPage })));
const AddressesPage = lazy(() => import('@/pages/AccountPages').then((m) => ({ default: m.AddressesPage })));
const OrdersPage = lazy(() => import('@/pages/AccountPages').then((m) => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import('@/pages/AccountPages').then((m) => ({ default: m.OrderDetailPage })));
const WishlistPage = lazy(() => import('@/pages/AccountPages').then((m) => ({ default: m.WishlistPage })));

const ContactPage = lazy(() => import('@/pages/ContactPage'));

const AboutPage = lazy(() => import('@/pages/StoryPages').then((m) => ({ default: m.AboutPage })));
const AteliePage = lazy(() => import('@/pages/StoryPages').then((m) => ({ default: m.AteliePage })));
const SustainabilityPage = lazy(() =>
  import('@/pages/StoryPages').then((m) => ({ default: m.SustainabilityPage })),
);

const HelpHubPage = lazy(() => import('@/pages/ContentPages').then((m) => ({ default: m.HelpHubPage })));
const HelpArticlePage = lazy(() =>
  import('@/pages/ContentPages').then((m) => ({ default: m.HelpArticlePage })),
);
const FaqPage = lazy(() => import('@/pages/ContentPages').then((m) => ({ default: m.FaqPage })));
const LegalPage = lazy(() => import('@/pages/ContentPages').then((m) => ({ default: m.LegalPage })));

const SearchPage = lazy(() => import('@/pages/MiscPages').then((m) => ({ default: m.SearchPage })));
const CampaignsPage = lazy(() => import('@/pages/MiscPages').then((m) => ({ default: m.CampaignsPage })));
const OrderSuccessPage = lazy(() => import('@/pages/MiscPages').then((m) => ({ default: m.OrderSuccessPage })));
const NotFoundPage = lazy(() => import('@/pages/MiscPages').then((m) => ({ default: m.NotFoundPage })));

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },

      // Turkish URL slugs: the storefront's primary market is Turkey and clean,
      // localised paths are worth more for SEO than English route names.
      { path: 'urunler', element: <ProductListPage /> },
      { path: 'urun/:slug', element: <ProductDetailPage /> },
      { path: 'kategori/:slug', element: <CategoryPage /> },
      { path: 'arama', element: <SearchPage /> },
      { path: 'kampanyalar', element: <CampaignsPage /> },

      { path: 'sepet', element: <CartPage /> },
      {
        path: 'odeme',
        element: (
          <RequireAuth>
            <CheckoutPage />
          </RequireAuth>
        ),
      },
      { path: 'siparis-alindi', element: <OrderSuccessPage /> },

      { path: 'giris', element: <LoginPage /> },
      { path: 'kayit', element: <RegisterPage /> },

      // Brand story. Editorial routes, each its own chunk.
      { path: 'hakkimizda', element: <AboutPage /> },
      { path: 'atolye', element: <AteliePage /> },
      { path: 'surdurulebilirlik', element: <SustainabilityPage /> },
      { path: 'iletisim', element: <ContactPage /> },

      // Help centre. The FAQ is matched before the generic article route so
      // 'sss' never falls through to a missing help document.
      { path: 'yardim', element: <HelpHubPage /> },
      { path: 'yardim/sss', element: <FaqPage /> },
      { path: 'yardim/:slug', element: <HelpArticlePage /> },

      // Legal. One component, four documents, four indexable URLs.
      { path: 'gizlilik', element: <LegalPage slug="gizlilik" /> },
      { path: 'kosullar', element: <LegalPage slug="kosullar" /> },
      { path: 'kvkk', element: <LegalPage slug="kvkk" /> },
      { path: 'cerez', element: <LegalPage slug="cerez" /> },

      {
        path: 'hesabim',
        element: (
          <RequireAuth>
            <AccountLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <ProfilePage /> },
          { path: 'guvenlik', element: <SecurityPage /> },
          { path: 'adresler', element: <AddressesPage /> },
          { path: 'siparisler', element: <OrdersPage /> },
          { path: 'siparisler/:id', element: <OrderDetailPage /> },
          { path: 'favoriler', element: <WishlistPage /> },
        ],
      },

      // Legacy/English aliases so old links keep resolving.
      { path: 'products', element: <Navigate to="/urunler" replace /> },
      { path: 'cart', element: <Navigate to="/sepet" replace /> },
      { path: 'login', element: <Navigate to="/giris" replace /> },
      { path: 'about', element: <Navigate to="/hakkimizda" replace /> },
      { path: 'contact', element: <Navigate to="/iletisim" replace /> },

      // The legal pages render from a :slug param, so the 404 route needs a real
      // path to redirect an unknown slug to.
      { path: '404', element: <NotFoundPage /> },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
