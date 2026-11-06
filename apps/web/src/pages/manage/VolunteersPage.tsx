import { Phone } from 'lucide-react';
import { VOLUNTEER_SKILLS, type VolunteerListItem } from '@crisislink/shared';
import { DistrictFilter, EnumSelect } from '../../components/filters';
import { useFilterParams } from '../../lib/filter-params';
import { useToast } from '../../components/toast-context';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Spinner,
  Tabs,
} from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { humanize, pluralize, timeAgo } from '../../lib/format';
import { useApproveVolunteer, useVolunteers } from '../../lib/queries';

const LIMIT = 24;

export default function VolunteersPage() {
  const { values, query, offset, set } = useFilterParams(['tab', 'district', 'skill'] as const);
  const tab = values.tab === 'pending' ? 'pending' : 'active';
  const { tab: _tab, ...filters } = query;
  const volunteers = useVolunteers({
    ...filters,
    status: tab === 'pending' ? 'PENDING' : 'ACTIVE',
    limit: LIMIT,
    offset,
  });
  const pendingCount = useVolunteers({ status: 'PENDING', limit: 1 }).data?.total;

  return (
    <div>
      <PageHeader title="Volunteers" back={{ to: '/manage', label: 'Manage' }} />
      <Tabs
        label="Volunteer lists"
        value={tab}
        onChange={(v) => set('tab', v === 'active' ? '' : v)}
        tabs={[
          { value: 'active', label: 'Active' },
          { value: 'pending', label: 'Waiting for approval', count: pendingCount },
        ]}
      />
      <div className="mb-5 flex flex-wrap gap-3">
        <DistrictFilter value={values.district} onChange={(v) => set('district', v)} />
        <EnumSelect
          label="Skill"
          value={values.skill}
          options={VOLUNTEER_SKILLS}
          onChange={(v) => set('skill', v)}
          allLabel="Any skill"
        />
      </div>
      {volunteers.isPending ? (
        <Spinner />
      ) : volunteers.isError ? (
        <ErrorState error={volunteers.error} onRetry={() => volunteers.refetch()} />
      ) : volunteers.data.items.length === 0 ? (
        <EmptyState
          title={tab === 'pending' ? 'No one is waiting for approval' : 'No volunteers match'}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {volunteers.data.items.map((v) => (
            <VolunteerCard key={v.id} volunteer={v} />
          ))}
        </div>
      )}
      {volunteers.data && (
        <Pagination
          total={volunteers.data.total}
          limit={LIMIT}
          offset={offset}
          onChange={(o) => set('offset', o)}
        />
      )}
    </div>
  );
}

function VolunteerCard({ volunteer: v }: { volunteer: VolunteerListItem }) {
  const approve = useApproveVolunteer();
  const toast = useToast();
  const profile = v.volunteerProfile;
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{v.fullName}</p>
          <p className="truncate text-sm text-slate-500">{v.email}</p>
        </div>
        {profile && (
          <Badge tone={profile.available ? 'success' : 'neutral'}>
            {profile.available ? 'Available' : 'Busy'}
          </Badge>
        )}
      </div>
      {profile && <p className="text-sm text-slate-600">{profile.district.name}</p>}
      {v.phone && (
        <a href={`tel:${v.phone}`} className="inline-flex items-center gap-1 text-sm underline">
          <Phone className="size-3.5" aria-hidden /> {v.phone}
        </a>
      )}
      <div className="flex flex-wrap gap-1">
        {profile?.skills.length ? (
          profile.skills.map((s) => <Badge key={s}>{humanize(s)}</Badge>)
        ) : (
          <span className="text-xs text-slate-400">No skills listed</span>
        )}
      </div>
      {v.status === 'PENDING' ? (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">Signed up {timeAgo(v.createdAt)}</span>
          <Button
            size="sm"
            loading={approve.isPending}
            onClick={() =>
              approve.mutate(v.id, {
                onSuccess: () => toast(`${v.fullName} approved`),
                onError: (e) => toast(errorMessage(e), 'error'),
              })
            }
          >
            Approve
          </Button>
        </div>
      ) : (
        <p className="mt-1 text-xs text-slate-500">
          {pluralize(v._count.assignedTasks, 'active task')}
        </p>
      )}
    </Card>
  );
}
