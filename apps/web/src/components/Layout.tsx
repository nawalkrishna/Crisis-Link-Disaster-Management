import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { AlertTriangle, LogOut, Menu, UserRound, X } from 'lucide-react';
import { isAdmin, isStaff, useCurrentUser, useLogout } from '../lib/auth';
import { useLiveUpdates } from '../lib/live';
import { pendingOutboxCount } from '../lib/offline';
import { ApiStatus } from './ApiStatus';
import { OfflineBanner, Outbox, UpdatePrompt } from './OfflineStatus';
import { buttonClass, cn } from './styles';
import { PageLoader } from './ui';

type NavItem = { to: string; label: string };

function useNavItems(): NavItem[] {
  const { data: user } = useCurrentUser();
  const items: NavItem[] = [
    { to: '/needs', label: 'Needs' },
    { to: '/incidents', label: 'Incidents' },
  ];
  if (user?.role === 'VOLUNTEER') items.push({ to: '/tasks', label: 'My tasks' });
  if (isStaff(user)) items.push({ to: '/manage', label: 'Manage' });
  if (isStaff(user)) items.push({ to: '/tasks', label: 'Tasks' });
  if (isAdmin(user)) items.push({ to: '/admin/users', label: 'Users' });
  if (isAdmin(user)) items.push({ to: '/admin/sms', label: 'SMS' });
  return items;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium',
    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900',
  );

export function Layout() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const navItems = useNavItems();
  useLiveUpdates(); // keep every page in sync with changes made by others
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  const onLogout = () => {
    close();
    // Logging out clears this device's cache - including writes still waiting to be sent.
    const unsent = pendingOutboxCount();
    if (
      unsent > 0 &&
      !window.confirm(
        `${unsent} change(s) made offline have not been sent yet. Log out and discard them?`,
      )
    )
      return;
    logout.mutate(undefined, { onSettled: () => navigate('/') });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900">
      {/* Keyboard users can jump straight past the navigation. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="text-lg font-bold tracking-tight" onClick={close}>
            Crisis<span className="text-red-600">Link</span>
          </Link>

          <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavLink key={item.to + item.label} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-2 md:flex">
            <Link to="/report" className={buttonClass('emergency', 'sm')}>
              <AlertTriangle className="size-4" aria-hidden /> Report
            </Link>
            {user ? (
              <>
                <Link to="/account" className={buttonClass('ghost', 'sm')}>
                  <UserRound className="size-4" aria-hidden />
                  <span className="max-w-32 truncate">{user.fullName}</span>
                </Link>
                <button type="button" onClick={onLogout} className={buttonClass('ghost', 'sm')}>
                  <LogOut className="size-4" aria-hidden />
                  <span className="sr-only">Log out</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={buttonClass('ghost', 'sm')}>
                  Log in
                </Link>
                <Link to="/register" className={buttonClass('primary', 'sm')}>
                  Volunteer
                </Link>
              </>
            )}
          </div>

          {/* Mobile */}
          <Link to="/report" className={cn(buttonClass('emergency', 'sm'), 'ml-auto md:hidden')}>
            <AlertTriangle className="size-4" aria-hidden /> Report
          </Link>
          <button
            type="button"
            className={cn(buttonClass('ghost', 'sm'), 'md:hidden')}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            <span className="sr-only">Menu</span>
          </button>
        </div>

        {menuOpen && (
          <nav
            id="mobile-menu"
            aria-label="Main"
            className="border-t border-slate-200 px-4 py-3 md:hidden"
          >
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to + item.label}
                  to={item.to}
                  className={navLinkClass}
                  onClick={close}
                >
                  {item.label}
                </NavLink>
              ))}
              <hr className="my-2 border-slate-200" />
              {user ? (
                <>
                  <NavLink to="/account" className={navLinkClass} onClick={close}>
                    Account ({user.fullName})
                  </NavLink>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className={navLinkClass} onClick={close}>
                    Log in
                  </NavLink>
                  <NavLink to="/register" className={navLinkClass} onClick={close}>
                    Become a volunteer
                  </NavLink>
                </>
              )}
            </div>
          </nav>
        )}
      </header>
      <OfflineBanner />

      {user?.status === 'PENDING' && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
          Your volunteer account is waiting for approval by a coordinator. You can browse tasks, but
          can’t claim them yet.
        </div>
      )}

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {/* Pages are code-split: their JavaScript downloads only when first visited. */}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500">
          <span>
            CrisisLink · Disaster relief coordination for Kerala ·{' '}
            <Link to="/alerts" className="underline hover:text-slate-800">
              Get SMS alerts
            </Link>
          </span>
          <span className="flex items-center gap-3">
            In an emergency call <strong className="text-slate-700">112</strong>
            <ApiStatus />
          </span>
        </div>
      </footer>
      <Outbox />
      <UpdatePrompt />
    </div>
  );
}
