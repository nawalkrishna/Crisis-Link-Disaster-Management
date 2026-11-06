import { TASK_STATUSES, type CurrentUser, type TaskStatus } from '@crisislink/shared';
import { DistrictFilter } from '../../components/filters';
import { useFilterParams } from '../../lib/filter-params';
import { TaskCard } from '../../components/TaskCard';
import { EmptyState, ErrorState, PageHeader, Pagination, Spinner, Tabs } from '../../components/ui';
import { isStaff, useCurrentUser } from '../../lib/auth';
import { humanize } from '../../lib/format';
import { useTasks } from '../../lib/queries';

const LIMIT = 20;

export default function TasksPage() {
  const { data: user } = useCurrentUser();
  if (!user) return null;
  return isStaff(user) ? <StaffTasks user={user} /> : <VolunteerTasks user={user} />;
}

// ---------- Volunteers ----------

function VolunteerTasks({ user }: { user: CurrentUser }) {
  const { values, offset, set } = useFilterParams(['tab', 'district'] as const);
  const tab = values.tab === 'mine' ? 'mine' : 'available';
  const district =
    values.district || (tab === 'available' ? (user.volunteer?.district.slug ?? '') : '');
  const tasks = useTasks(
    tab === 'mine'
      ? { mine: true, limit: LIMIT, offset }
      : { status: 'OPEN', district: district || undefined, limit: LIMIT, offset },
  );

  return (
    <div>
      <PageHeader
        title="Tasks"
        description={
          user.status === 'ACTIVE'
            ? 'Pick up a task near you. Coordinators see who is on it.'
            : 'You can claim tasks once a coordinator approves your account.'
        }
      />
      <Tabs
        label="Task lists"
        value={tab}
        onChange={(v) => set('tab', v === 'available' ? '' : v)}
        tabs={[
          { value: 'available', label: 'Available' },
          { value: 'mine', label: 'My tasks' },
        ]}
      />
      {tab === 'available' && (
        <div className="mb-4 max-w-xs">
          <DistrictFilter value={district} onChange={(v) => set('district', v)} />
        </div>
      )}
      <TaskList
        query={tasks}
        user={user}
        empty={tab === 'mine' ? 'You have no tasks yet' : 'No open tasks here right now'}
        offset={offset}
        onPage={(o) => set('offset', o)}
      />
    </div>
  );
}

// ---------- Staff ----------

function StaffTasks({ user }: { user: CurrentUser }) {
  const { values, offset, set } = useFilterParams(['status', 'mine'] as const);
  const status = (values.status || 'OPEN') as TaskStatus;
  const mine = values.mine === 'true';
  const tasks = useTasks({ status, mine: mine || undefined, limit: LIMIT, offset });

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Create tasks from a camp’s management page."
        actions={
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-slate-900"
              checked={mine}
              onChange={(e) => set('mine', e.target.checked ? 'true' : '')}
            />
            Only my camps
          </label>
        }
      />
      <Tabs
        label="Task status"
        value={status}
        onChange={(v) => set('status', v === 'OPEN' ? '' : v)}
        tabs={TASK_STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
      />
      <TaskList
        query={tasks}
        user={user}
        empty="No tasks in this state"
        offset={offset}
        onPage={(o) => set('offset', o)}
      />
    </div>
  );
}

// ---------- Shared list + card ----------

function TaskList({
  query,
  user,
  empty,
  offset,
  onPage,
}: {
  query: ReturnType<typeof useTasks>;
  user: CurrentUser;
  empty: string;
  offset: number;
  onPage: (offset: number) => void;
}) {
  if (query.isPending) return <Spinner />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data.items.length === 0) return <EmptyState title={empty} />;
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {query.data.items.map((task) => (
          <TaskCard key={task.id} task={task} user={user} />
        ))}
      </div>
      <Pagination total={query.data.total} limit={LIMIT} offset={offset} onChange={onPage} />
    </>
  );
}
