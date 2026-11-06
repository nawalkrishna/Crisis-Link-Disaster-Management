import { Link } from 'react-router';
import { AlertTriangle, Plus, UserCheck } from 'lucide-react';
import { CampCard } from '../../components/domain';
import { ButtonLink, Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui';
import { isAdmin, useCurrentUser } from '../../lib/auth';
import { pluralize } from '../../lib/format';
import { useCamps, useIncidents, useVolunteers } from '../../lib/queries';

export default function ManageHomePage() {
  const { data: user } = useCurrentUser();
  const admin = isAdmin(user);
  const camps = useCamps({ limit: 100 });
  const pending = useVolunteers({ status: 'PENDING', limit: 1 });
  const incidents = useIncidents({ active: true, status: 'REPORTED', limit: 1 });

  const campIds = user?.campIds ?? [];
  const myCamps = camps.data?.items.filter((c) => admin || campIds.includes(c.id)) ?? [];

  return (
    <div>
      <PageHeader
        title={admin ? 'All camps' : 'Your camps'}
        description={admin ? 'You can manage every camp as an admin.' : 'Camps you coordinate.'}
        actions={
          admin && (
            <ButtonLink to="/admin/camps/new">
              <Plus className="size-4" aria-hidden /> New camp
            </ButtonLink>
          )
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Link to="/manage/volunteers" className="block">
          <Card className="flex items-center gap-4 transition hover:border-slate-400">
            <UserCheck className="size-8 text-slate-500" aria-hidden />
            <div>
              <p className="font-semibold">
                {pending.data ? pluralize(pending.data.total, 'volunteer') : '…'} waiting for
                approval
              </p>
              <p className="text-sm text-slate-500">Review sign-ups and find volunteers by skill</p>
            </div>
          </Card>
        </Link>
        <Link to="/incidents?status=REPORTED" className="block">
          <Card className="flex items-center gap-4 transition hover:border-slate-400">
            <AlertTriangle className="size-8 text-red-500" aria-hidden />
            <div>
              <p className="font-semibold">
                {incidents.data ? pluralize(incidents.data.total, 'new report') : '…'} to verify
              </p>
              <p className="text-sm text-slate-500">Verify, resolve or dismiss incident reports</p>
            </div>
          </Card>
        </Link>
      </div>

      {camps.isPending ? (
        <Spinner />
      ) : camps.isError ? (
        <ErrorState error={camps.error} onRetry={() => camps.refetch()} />
      ) : myCamps.length === 0 ? (
        <EmptyState title="You don’t coordinate any camps yet">
          An admin assigns coordinators to camps.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myCamps.map((camp) => (
            <CampCard key={camp.id} camp={camp} href={`/manage/camps/${camp.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
