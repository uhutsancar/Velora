import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { PERMISSIONS } from '@velora/shared';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Guarded, RequireAuth } from '@/components/guards/RequireAuth';

// The dashboard is the landing route, so it ships in the entry chunk.
import DashboardPage from '@/pages/DashboardPage';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ProductsPage = lazy(() => import('@/pages/ProductsPage'));
const ProductFormPage = lazy(() => import('@/pages/ProductFormPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

const CategoriesPage = lazy(() => import('@/pages/TaxonomyPages').then((m) => ({ default: m.CategoriesPage })));
const BrandsPage = lazy(() => import('@/pages/TaxonomyPages').then((m) => ({ default: m.BrandsPage })));

const OrdersPage = lazy(() => import('@/pages/OrdersPages').then((m) => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import('@/pages/OrdersPages').then((m) => ({ default: m.OrderDetailPage })));

const CouponsPage = lazy(() => import('@/pages/PromotionPages').then((m) => ({ default: m.CouponsPage })));
const CampaignsPage = lazy(() => import('@/pages/PromotionPages').then((m) => ({ default: m.CampaignsPage })));

const CustomersPage = lazy(() => import('@/pages/PeoplePages').then((m) => ({ default: m.CustomersPage })));
const ReviewsPage = lazy(() => import('@/pages/PeoplePages').then((m) => ({ default: m.ReviewsPage })));

const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      // Every guarded route names the permission the API will also check.
      { index: true, element: <Guarded permission={PERMISSIONS.AnalyticsRead}><DashboardPage /></Guarded> },

      { path: 'products', element: <Guarded permission={PERMISSIONS.ProductsRead}><ProductsPage /></Guarded> },
      { path: 'products/new', element: <Guarded permission={PERMISSIONS.ProductsWrite}><ProductFormPage /></Guarded> },
      { path: 'products/:id', element: <Guarded permission={PERMISSIONS.ProductsRead}><ProductFormPage /></Guarded> },

      { path: 'categories', element: <Guarded permission={PERMISSIONS.CategoriesWrite}><CategoriesPage /></Guarded> },
      { path: 'brands', element: <Guarded permission={PERMISSIONS.BrandsWrite}><BrandsPage /></Guarded> },
      { path: 'reviews', element: <Guarded permission={PERMISSIONS.ProductsWrite}><ReviewsPage /></Guarded> },

      { path: 'orders', element: <Guarded permission={PERMISSIONS.OrdersRead}><OrdersPage /></Guarded> },
      { path: 'orders/:id', element: <Guarded permission={PERMISSIONS.OrdersRead}><OrderDetailPage /></Guarded> },

      { path: 'customers', element: <Guarded permission={PERMISSIONS.UsersRead}><CustomersPage /></Guarded> },

      { path: 'coupons', element: <Guarded permission={PERMISSIONS.CouponsWrite}><CouponsPage /></Guarded> },
      { path: 'campaigns', element: <Guarded permission={PERMISSIONS.CampaignsWrite}><CampaignsPage /></Guarded> },

      { path: 'settings', element: <SettingsPage /> },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
