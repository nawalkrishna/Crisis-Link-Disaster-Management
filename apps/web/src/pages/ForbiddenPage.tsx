import type { CurrentUser } from '@crisislink/shared';
import { ButtonLink } from '../components/ui';

export function ForbiddenPage({ user }: { user: CurrentUser }) {
  const pending = user.status === 'PENDING';
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm font-semibold text-amber-700">
        {pending ? 'Waiting for approval' : '403'}
      </p>
      <h1 className="mt-2 text-2xl font-bold">
        {pending ? 'Your account isn’t active yet' : 'You don’t have access to this page'}
      </h1>
      <p className="mt-2 text-slate-600">
        {pending
          ? 'A coordinator will review your sign-up soon.'
          : `You are logged in as ${user.fullName} (${user.role.toLowerCase()}).`}
      </p>
      <ButtonLink to="/" className="mt-6">
        Go to the dashboard
      </ButtonLink>
    </div>
  );
}
