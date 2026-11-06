import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import type { Role } from '@crisislink/shared';
import { useCurrentUser } from '../lib/auth';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { PageLoader } from './ui';

/**
 * Route guard. The UI hides what you can't use, but this is only for convenience:
 * the REAL security check happens on the server for every request.
 */
export function RequireAuth({
  roles,
  requireActive = true,
  children,
}: {
  roles?: Role[];
  requireActive?: boolean;
  children: ReactNode;
}) {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();

  if (isPending) return <PageLoader />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if ((roles && !roles.includes(user.role)) || (requireActive && user.status !== 'ACTIVE')) {
    return <ForbiddenPage user={user} />;
  }
  return <>{children}</>;
}

/** Guards a group of routes (used as a "pathless layout route" in router.tsx). */
export function ProtectedOutlet(props: { roles?: Role[]; requireActive?: boolean }) {
  return (
    <RequireAuth {...props}>
      <Outlet />
    </RequireAuth>
  );
}
