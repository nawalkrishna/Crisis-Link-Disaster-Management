import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  PRIORITIES,
  VOLUNTEER_SKILLS,
  createTaskSchema,
  type CampSummary,
} from '@crisislink/shared';
import { TaskCard } from '../../../components/TaskCard';
import { useToast } from '../../../components/toast-context';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  FormError,
  Input,
  Select,
  Spinner,
  Textarea,
} from '../../../components/ui';
import { useCurrentUser } from '../../../lib/auth';
import { applyServerErrors, emptyToUndefined, useZodForm } from '../../../lib/forms';
import { humanize } from '../../../lib/format';
import { useCreateTask, useTasks } from '../../../lib/queries';

export function TasksTab({ camp }: { camp: CampSummary }) {
  const tasks = useTasks({ campId: camp.id, limit: 50 });
  const { data: user } = useCurrentUser();
  const [formOpen, setFormOpen] = useState(false);
  const active =
    tasks.data?.items.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED') ?? [];
  const finished =
    tasks.data?.items.filter((t) => t.status === 'DONE' || t.status === 'CANCELLED') ?? [];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen((o) => !o)} aria-expanded={formOpen}>
          <Plus className="size-4" aria-hidden /> New task
        </Button>
      </div>
      {formOpen && <NewTaskForm campId={camp.id} onDone={() => setFormOpen(false)} />}
      {tasks.isPending || !user ? (
        <Spinner />
      ) : tasks.isError ? (
        <ErrorState error={tasks.error} onRetry={() => tasks.refetch()} />
      ) : active.length === 0 && finished.length === 0 ? (
        <EmptyState title="No tasks for this camp">
          Create one and volunteers in {camp.district.name} will see it.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {active.map((t) => (
              <TaskCard key={t.id} task={t} user={user} />
            ))}
          </div>
          {finished.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-600">
                Finished and cancelled ({finished.length})
              </summary>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {finished.map((t) => (
                  <TaskCard key={t.id} task={t} user={user} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function NewTaskForm({ campId, onDone }: { campId: string; onDone: () => void }) {
  const create = useCreateTask();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState, setError } = useZodForm(createTaskSchema, {
    campId,
    priority: 'MEDIUM',
  });
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    create.mutate(values, {
      onSuccess: (t) => {
        toast(`Task created: ${t.title}`);
        onDone();
      },
      onError: (err) => setFormError(applyServerErrors(err, setError)),
    });
  });

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormError message={formError} />
        </div>
        <Field label="Title" required error={errors.title?.message} className="sm:col-span-2">
          {(a) => (
            <Input {...a} autoFocus placeholder="e.g. Unload water truck" {...register('title')} />
          )}
        </Field>
        <Field
          label="Details"
          required
          hint="When, where, how many people"
          error={errors.description?.message}
          className="sm:col-span-2"
        >
          {(a) => <Textarea {...a} rows={3} {...register('description')} />}
        </Field>
        <Field label="Priority" error={errors.priority?.message}>
          {(a) => (
            <Select {...a} {...register('priority')}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {humanize(p)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Required skill" error={errors.requiredSkill?.message}>
          {(a) => (
            <Select {...a} {...register('requiredSkill', { setValueAs: emptyToUndefined })}>
              <option value="">None</option>
              {VOLUNTEER_SKILLS.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" loading={create.isPending}>
            Create task
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
