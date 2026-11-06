import { MapPin, UserRound } from 'lucide-react';
import type { CurrentUser, Task, TaskStatus } from '@crisislink/shared';
import { errorMessage } from '../lib/api';
import { isStaff, managesCamp } from '../lib/auth';
import { humanize, priorityTone, statusTone, timeAgo } from '../lib/format';
import { useClaimTask, useUpdateTask } from '../lib/queries';
import { useToast } from './toast-context';
import { Badge, Button, ButtonLink, Card } from './ui';

/** One task with the actions this user may take on it (the API re-checks every action). */
export function TaskCard({ task, user }: { task: Task; user: CurrentUser }) {
  const claim = useClaimTask();
  const update = useUpdateTask();
  const toast = useToast();
  const busy = claim.isPending || update.isPending;

  const move = (status: TaskStatus, message: string) =>
    update.mutate(
      { id: task.id, status },
      { onSuccess: () => toast(message), onError: (err) => toast(errorMessage(err), 'error') },
    );

  const mine = task.assignee?.id === user.id;
  const manager =
    isStaff(user) &&
    (user.role === 'ADMIN' ||
      (task.campId !== null && managesCamp(user, task.campId)) ||
      task.createdBy.id === user.id);
  const missingSkill =
    task.requiredSkill !== null &&
    user.volunteer !== null &&
    !user.volunteer.skills.includes(task.requiredSkill);

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={priorityTone[task.priority]}>{humanize(task.priority)}</Badge>
        <Badge tone={statusTone(task.status)}>{humanize(task.status)}</Badge>
        {task.requiredSkill && <Badge>Needs {humanize(task.requiredSkill).toLowerCase()}</Badge>}
        <span className="ml-auto text-xs text-slate-500">{timeAgo(task.createdAt)}</span>
      </div>
      <h3 className="font-semibold">{task.title}</h3>
      <p className="text-sm text-slate-700">{task.description}</p>
      <p className="flex items-center gap-1 text-sm text-slate-500">
        <MapPin className="size-3.5" aria-hidden />
        {task.camp ? `${task.camp.name}, ` : 'Field task, '}
        {task.district.name}
      </p>
      {task.assignee && (
        <p className="flex items-center gap-1 text-sm text-slate-600">
          <UserRound className="size-3.5" aria-hidden />
          {mine ? 'You' : task.assignee.fullName}
          {!mine && task.assignee.phone && (
            <a href={`tel:${task.assignee.phone}`} className="underline">
              {task.assignee.phone}
            </a>
          )}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {/* Volunteer actions */}
        {user.role === 'VOLUNTEER' && task.status === 'OPEN' && (
          <>
            <Button
              size="sm"
              disabled={user.status !== 'ACTIVE' || missingSkill}
              loading={claim.isPending}
              onClick={() =>
                claim.mutate(task.id, {
                  onSuccess: () => toast('Task is yours - thank you!'),
                  onError: (err) => toast(errorMessage(err), 'error'),
                })
              }
            >
              Claim task
            </Button>
            {missingSkill && (
              <span className="text-xs text-slate-500">Requires a skill you haven’t listed</span>
            )}
          </>
        )}
        {mine && task.status === 'ASSIGNED' && (
          <Button size="sm" disabled={busy} onClick={() => move('IN_PROGRESS', 'Started')}>
            Start
          </Button>
        )}
        {mine && task.status === 'IN_PROGRESS' && (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => move('DONE', 'Marked as done - great work!')}
          >
            Mark done
          </Button>
        )}
        {(mine || manager) && (task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => move('OPEN', 'Task released')}
          >
            {mine ? 'Give up' : 'Unassign'}
          </Button>
        )}

        {/* Staff actions */}
        {manager && task.status !== 'DONE' && task.status !== 'CANCELLED' && (
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => move('CANCELLED', 'Task cancelled')}
          >
            Cancel
          </Button>
        )}
        {manager && task.status === 'CANCELLED' && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => move('OPEN', 'Task reopened')}
          >
            Reopen
          </Button>
        )}
        {manager && task.campId && (
          <ButtonLink to={`/manage/camps/${task.campId}?tab=tasks`} size="sm" variant="ghost">
            Open camp
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}
