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

      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
