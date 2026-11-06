import { useState } from 'react';
import { Search } from 'lucide-react';
import { ACCOUNT_STATUSES, ROLES, type Role, type UserListItem } from '@crisislink/shared';
import { EnumSelect } from '../../components/filters';
import { useFilterParams } from '../../lib/filter-params';
import { useToast } from '../../components/toast-context';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Pagination,
  Select,
  Spinner,
} from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { useCurrentUser } from '../../lib/auth';
import { humanize, statusTone, timeAgo } from '../../lib/format';
import { useCamps, useSetUserCamps, useUpdateUser, useUsers } from '../../lib/queries';

const LIMIT = 25;

export default function UsersPage() {
  const { values, query, offset, set } = useFilterParams(['role', 'status', 'q'] as const);
  const [search, setSearch] = useState(values.q);
  const users = useUsers({ ...query, limit: LIMIT, offset });

  return (
    <div>
      <PageHeader
        title="Users"
        description="Approve, suspend and change roles. Assign coordinators to camps."
      />
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <form
          role="search"
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            set('q', search.trim());
          }}
        >
          <Field label="Name or email">
            {(a) => <Input {...a} value={search} onChange={(e) => setSearch(e.target.value)} />}
          </Field>
          <Button type="submit" variant="secondary">
            <Search className="size-4" aria-hidden />
            <span className="sr-only">Search</span>
          </Button>
        </form>
        <EnumSelect
          label="Role"
          value={values.role}
          options={ROLES}
          onChange={(v) => set('role', v)}
        />
        <EnumSelect
          label="Status"
          value={values.status}
          options={ACCOUNT_STATUSES}
          onChange={(v) => set('status', v)}
        />
      </div>

      {users.isPending ? (
        <Spinner />
      ) : users.isError ? (
        <ErrorState error={users.error} onRetry={() => users.refetch()} />
      ) : users.data.items.length === 0 ? (
        <EmptyState title="No users match" />
      ) : (
        <div className="space-y-3">
          {users.data.items.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </div>
      )}
      {users.data && (
        <Pagination
          total={users.data.total}
          limit={LIMIT}
          offset={offset}
          onChange={(o) => set('offset', o)}
        />
      )}
    </div>
  );
}

function UserRow({ user: u }: { user: UserListItem }) {
  const { data: me } = useCurrentUser();
  const update = useUpdateUser();
  const toast = useToast();
  const isMe = me?.id === u.id;

  const run = (body: { role?: Role; status?: UserListItem['status'] }, message: string) =>
    update.mutate(
      { id: u.id, ...body },
      { onSuccess: () => toast(message), onError: (e) => toast(errorMessage(e), 'error') },
    );

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {u.fullName} {isMe && <span className="text-xs font-normal text-slate-500">(you)</span>}
          </p>
          <p className="truncate text-sm text-slate-500">
            {u.email} · {u.lastLoginAt ? `last login ${timeAgo(u.lastLoginAt)}` : 'never logged in'}
          </p>
        </div>
        <Badge tone={statusTone(u.status)}>{humanize(u.status)}</Badge>
        <label className="sr-only" htmlFor={`role-${u.id}`}>
          Role for {u.fullName}
        </label>
        <Select
          id={`role-${u.id}`}
          className="h-8 w-36 text-sm"
          value={u.role}
          disabled={isMe || update.isPending}
          onChange={(e) =>
            run(
              { role: e.target.value as Role },
              `${u.fullName} is now ${humanize(e.target.value).toLowerCase()}`,
            )
          }
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {humanize(r)}
            </option>
          ))}
        </Select>
        {u.status !== 'ACTIVE' && (
          <Button
            size="sm"
            disabled={update.isPending}
            onClick={() => run({ status: 'ACTIVE' }, `${u.fullName} activated`)}
          >
            Activate
          </Button>
        )}
        {u.status !== 'SUSPENDED' && !isMe && (
          <Button
            size="sm"
            variant="danger"
            disabled={update.isPending}
            onClick={() => {
              if (window.confirm(`Suspend ${u.fullName}? They will be logged out everywhere.`)) {
                run({ status: 'SUSPENDED' }, `${u.fullName} suspended`);
              }
            }}
          >
            Suspend
          </Button>
        )}
      </div>
      {u.role === 'COORDINATOR' && <CampAssignment user={u} />}
    </Card>
  );
}

/** Pick the camps a coordinator manages. */
function CampAssignment({ user }: { user: UserListItem }) {
  const camps = useCamps({ limit: 100 });
  const setCamps = useSetUserCamps();
  const toast = useToast();
  const current = user.coordinatedCamps.map((c) => c.camp.id);
  const [selected, setSelected] = useState<string[]>(current);
  const changed =
    selected.length !== current.length || selected.some((id) => !current.includes(id));

  return (
    <details className="rounded-lg bg-slate-50 px-3 py-2">
      <summary className="cursor-pointer text-sm text-slate-700">
        Manages:{' '}
        {user.coordinatedCamps.length ? (
          user.coordinatedCamps.map((c) => c.camp.name).join(', ')
        ) : (
          <em>no camps yet</em>
        )}
      </summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {camps.data?.items.map((camp) => (
          <label key={camp.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-slate-900"
              checked={selected.includes(camp.id)}
              onChange={(e) =>
                setSelected((s) =>
                  e.target.checked ? [...s, camp.id] : s.filter((id) => id !== camp.id),
                )
              }
            />
            {camp.name} <span className="text-slate-400">· {camp.district.name}</span>
          </label>
        ))}
      </div>
      <Button
        size="sm"
        className="mt-3"
        disabled={!changed}
        loading={setCamps.isPending}
        onClick={() =>
          setCamps.mutate(
            { id: user.id, campIds: selected },
            {
              onSuccess: () => toast('Camp assignments saved'),
              onError: (e) => toast(errorMessage(e), 'error'),
            },
          )
        }
      >
        Save camps
      </Button>
    </details>
  );
}
