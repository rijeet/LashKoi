import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { MapLayout } from '@/layouts/MapLayout';
import { SeoLayout } from '@/layouts/SeoLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { MapPage } from '@/pages/MapPage';
import { IncidentSeoPage } from '@/pages/IncidentSeoPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

const AdminLoginPage = lazy(() =>
  import('@/pages/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })),
);
const AdminIncidentsPage = lazy(() =>
  import('@/pages/admin/AdminIncidentsPage').then((m) => ({
    default: m.AdminIncidentsPage,
  })),
);
const AdminIncidentNewPage = lazy(() =>
  import('@/pages/admin/AdminIncidentEditPage').then((m) => ({
    default: m.AdminIncidentNewPage,
  })),
);
const AdminIncidentEditPage = lazy(() =>
  import('@/pages/admin/AdminIncidentEditPage').then((m) => ({
    default: m.AdminIncidentEditPage,
  })),
);
const AdminBannersPage = lazy(() =>
  import('@/pages/admin/AdminBannersPage').then((m) => ({
    default: m.AdminBannersPage,
  })),
);
const AdminAnalyticsPage = lazy(() =>
  import('@/pages/admin/AdminAnalyticsPage').then((m) => ({
    default: m.AdminAnalyticsPage,
  })),
);

const adminFallback = <p className="p-8 text-slate-400">Loading admin…</p>;

const router = createBrowserRouter([
  {
    path: '/',
    Component: MapLayout,
    children: [{ index: true, Component: MapPage }],
  },
  {
    path: '/:lang',
    Component: MapLayout,
    children: [{ index: true, Component: MapPage }],
  },
  {
    path: '/:lang/incidents/:slug',
    Component: SeoLayout,
    children: [{ index: true, Component: IncidentSeoPage }],
  },
  {
    path: '/admin/login',
    element: (
      <Suspense fallback={adminFallback}>
        <AdminLoginPage />
      </Suspense>
    ),
  },
  {
    path: '/admin',
    Component: AdminLayout,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={adminFallback}>
            <AdminIncidentsPage />
          </Suspense>
        ),
      },
      {
        path: 'incidents/new',
        element: (
          <Suspense fallback={adminFallback}>
            <AdminIncidentNewPage />
          </Suspense>
        ),
      },
      {
        path: 'incidents/:id',
        element: (
          <Suspense fallback={adminFallback}>
            <AdminIncidentEditPage />
          </Suspense>
        ),
      },
      {
        path: 'banners',
        element: (
          <Suspense fallback={adminFallback}>
            <AdminBannersPage />
          </Suspense>
        ),
      },
      {
        path: 'analytics',
        element: (
          <Suspense fallback={adminFallback}>
            <AdminAnalyticsPage />
          </Suspense>
        ),
      },
    ],
  },
  { path: '*', Component: NotFoundPage },
]);

export function App() {
  return <RouterProvider router={router} />;
}
