import type { ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { ProtectedOutlet } from './components/RequireAuth';
import { RouteError } from './components/RouteError';

/**
 * CODE SPLITTING: `lazy` loads each page's JavaScript only when the route is first visited,
 * so someone opening the public dashboard on a slow mobile connection doesn't download the
 * admin panel. Each import() becomes its own small file in the production build.
 */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
});

export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      // Public
      { index: true, lazy: page(() => import('./pages/public/HomePage')) },
      { path: 'districts/:slug', lazy: page(() => import('./pages/public/DistrictPage')) },
      { path: 'camps/:id', lazy: page(() => import('./pages/public/CampPage')) },
      { path: 'needs', lazy: page(() => import('./pages/public/NeedsPage')) },
      { path: 'donate', lazy: page(() => import('./pages/public/PledgePage')) },
      { path: 'incidents', lazy: page(() => import('./pages/public/IncidentsPage')) },
      { path: 'report', lazy: page(() => import('./pages/public/ReportIncidentPage')) },
      { path: 'login', lazy: page(() => import('./pages/auth/LoginPage')) },
      { path: 'register', lazy: page(() => import('./pages/auth/RegisterPage')) },
      { path: 'alerts', lazy: page(() => import('./pages/public/AlertsPage')) },
      { path: 'u/:code', lazy: page(() => import('./pages/public/UnsubscribePage')) },

      // "Pathless layout routes" group pages behind a guard without adding to the URL.
      // Any logged-in user (pending volunteers too):
      {
        element: <ProtectedOutlet requireActive={false} />,
        children: [
          { path: 'account', lazy: page(() => import('./pages/auth/AccountPage')) },
          { path: 'tasks', lazy: page(() => import('./pages/volunteer/TasksPage')) },
        ],
      },
      // Staff (admins + coordinators):
      {
        element: <ProtectedOutlet roles={['ADMIN', 'COORDINATOR']} />,
        children: [
          { path: 'manage', lazy: page(() => import('./pages/manage/ManageHomePage')) },
          { path: 'manage/camps/:id', lazy: page(() => import('./pages/manage/ManageCampPage')) },
          { path: 'manage/volunteers', lazy: page(() => import('./pages/manage/VolunteersPage')) },
        ],
      },
      // Admins only:
      {
        element: <ProtectedOutlet roles={['ADMIN']} />,
        children: [
          { path: 'admin/users', lazy: page(() => import('./pages/admin/UsersPage')) },
          { path: 'admin/camps/new', lazy: page(() => import('./pages/admin/NewCampPage')) },
          { path: 'admin/sms', lazy: page(() => import('./pages/admin/SmsLogPage')) },
        ],
      },

      { path: '*', lazy: page(() => import('./pages/NotFoundPage')) },
    ],
  },
]);
