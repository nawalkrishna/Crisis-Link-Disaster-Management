import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  PRIORITIES,
  SUPPLY_CATEGORIES,
  createNeedSchema,
  type CampNeed,
  type CampSummary,
  type NeedStatus,
  type Priority,
} from '@crisislink/shared';
import { NeedRow } from '../../../components/domain';
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
} from '../../../components/ui';
import { errorMessage } from '../../../lib/api';
import { applyServerErrors, emptyToUndefined, useZodForm } from '../../../lib/forms';
import { humanize } from '../../../lib/format';
import { useAddNeed, useCampNeeds, useUpdateNeed } from '../../../lib/queries';

export function NeedsTab({ camp }: { camp: CampSummary }) {
  const needs = useCampNeeds(camp.id);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          onClick={() => setFormOpen((o) => !o)}
          disabled={camp.status === 'CLOSED'}
          aria-expanded={formOpen}
        >
          <Plus className="size-4" aria-hidden /> Add a need
        </Button>
      </div>
      {formOpen && <AddNeedForm campId={camp.id} onDone={() => setFormOpen(false)} />}
      <Card className="py-0">
        {needs.isPending ? (
          <Spinner />
        ) : needs.isError ? (
          <div className="py-5">
            <ErrorState error={needs.error} onRetry={() => needs.refetch()} />
          </div>
        ) : needs.data.length === 0 ? (
          <div className="py-5">
            <EmptyState title="No needs posted yet">
              Post what the camp is short of so donors can help.
            </EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {needs.data.map((need) => (
              <NeedRow key={need.id} need={need} actions={<NeedActions need={need} />} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function NeedActions({ need }: { need: CampNeed }) {
  const update = useUpdateNeed();
  const toast = useToast();
  const run = (body: { status?: NeedStatus; priority?: Priority }, message: string) =>
    update.mutate(
      { id: need.id, ...body },
      { onSuccess: () => toast(message), onError: (e) => toast(errorMessage(e), 'error') },
    );

  if (need.status !== 'OPEN') {
    return (
      <Button
        size="sm"
        variant="ghost"
        disabled={update.isPending}
        onClick={() => run({ status: 'OPEN' }, 'Need reopened')}
      >
        Reopen
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`priority-${need.id}`}>
        Priority
      </label>
      <Select
        id={`priority-${need.id}`}
        className="h-8 w-28 text-xs"
        value={need.priority}
        disabled={update.isPending}
        onChange={(e) => run({ priority: e.target.value as Priority }, 'Priority updated')}
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {humanize(p)}
          </option>
        ))}
      </Select>
      <Button
        size="sm"
        variant="secondary"
        disabled={update.isPending}
        onClick={() => run({ status: 'FULFILLED' }, 'Marked fulfilled')}
      >
        Fulfilled
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={update.isPending}
        onClick={() => run({ status: 'CANCELLED' }, 'Need cancelled')}
      >
        Cancel
      </Button>
    </div>
  );
}

function AddNeedForm({ campId, onDone }: { campId: string; onDone: () => void }) {
  const add = useAddNeed(campId);
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState, setError } = useZodForm(createNeedSchema, {
    category: 'FOOD',
    priority: 'MEDIUM',
  });
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    add.mutate(values, {
      onSuccess: (n) => {
        toast(`Posted: ${n.item}`);
        onDone();
      },
      onError: (err) => setFormError(applyServerErrors(err, setError)),
    });
  });

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-6">
        <div className="sm:col-span-6">
          <FormError message={formError} />
        </div>
        <Field label="Item" required error={errors.item?.message} className="sm:col-span-3">
          {(a) => (
            <Input {...a} autoFocus placeholder="e.g. Drinking water (1L)" {...register('item')} />
          )}
        </Field>
        <Field label="Category" error={errors.category?.message} className="sm:col-span-3">
          {(a) => (
            <Select {...a} {...register('category')}>
              {SUPPLY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {humanize(c)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label="Quantity needed"
          required
          error={errors.quantityNeeded?.message}
          className="sm:col-span-2"
        >
          {(a) => (
            <Input
              {...a}
              type="number"
              min={1}
              {...register('quantityNeeded', { valueAsNumber: true })}
            />
          )}
        </Field>
        <Field
          label="Unit"
          hint="kg, bottles, packs…"
          error={errors.unit?.message}
          className="sm:col-span-2"
        >
          {(a) => <Input {...a} {...register('unit', { setValueAs: emptyToUndefined })} />}
        </Field>
        <Field label="Priority" error={errors.priority?.message} className="sm:col-span-2">
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
        <div className="flex gap-2 sm:col-span-6">
          <Button type="submit" loading={add.isPending}>
            Post need
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
