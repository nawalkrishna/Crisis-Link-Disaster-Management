import { useState } from 'react';
import { Search, Stethoscope, UserPlus } from 'lucide-react';
import { GENDERS, createEvacueeSchema, type CampSummary } from '@crisislink/shared';
import { useToast } from '../../../components/toast-context';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  FormError,
  Input,
  Pagination,
  Select,
  Spinner,
  Textarea,
} from '../../../components/ui';
import { errorMessage } from '../../../lib/api';
import {
  applyServerErrors,
  emptyToUndefined,
  toOptionalNumber,
  useZodForm,
} from '../../../lib/forms';
import { formatDateTime, humanize } from '../../../lib/format';
import { queueable, useOnline } from '../../../lib/offline';
import { useCheckIn, useCheckOut, useEvacuees } from '../../../lib/queries';

const LIMIT = 25;

export function EvacueesTab({ camp }: { camp: CampSummary }) {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [offset, setOffset] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const evacuees = useEvacuees(camp.id, {
    q: q || undefined,
    includeCheckedOut: showHistory || undefined,
    limit: LIMIT,
    offset,
  });
  const checkOut = useCheckOut();
  const toast = useToast();
  const full = camp.occupancy >= camp.capacity || camp.status !== 'OPEN';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <form
          className="flex flex-1 items-end gap-2"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(search.trim());
            setOffset(0);
          }}
        >
          <Field label="Search by name" className="flex-1">
            {(a) => <Input {...a} value={search} onChange={(e) => setSearch(e.target.value)} />}
          </Field>
          <Button type="submit" variant="secondary">
            <Search className="size-4" aria-hidden />
            <span className="sr-only">Search</span>
          </Button>
        </form>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-slate-900"
            checked={showHistory}
            onChange={(e) => {
              setShowHistory(e.target.checked);
              setOffset(0);
            }}
          />
          Include checked-out
        </label>
        <Button
          onClick={() => setFormOpen((o) => !o)}
          disabled={full && !formOpen}
          aria-expanded={formOpen}
        >
          <UserPlus className="size-4" aria-hidden /> Check someone in
        </Button>
      </div>
      {full && (
        <p className="text-sm text-amber-800">
          {camp.status === 'CLOSED'
            ? 'This camp is closed.'
            : 'This camp is at capacity - new arrivals should be sent to another camp.'}
        </p>
      )}

      {formOpen && <CheckInForm campId={camp.id} onDone={() => setFormOpen(false)} />}

      <Card className="overflow-x-auto p-0">
        {evacuees.isPending ? (
          <Spinner />
        ) : evacuees.isError ? (
          <div className="p-5">
            <ErrorState error={evacuees.error} onRetry={() => evacuees.refetch()} />
          </div>
        ) : evacuees.data.items.length === 0 ? (
          <div className="p-5">
            <EmptyState title={q ? `No one named “${q}”` : 'No one checked in yet'} />
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Name
                </th>
                <th scope="col" className="px-4 py-3">
                  Age / gender
                </th>
                <th scope="col" className="px-4 py-3">
                  From
                </th>
                <th scope="col" className="px-4 py-3">
                  Checked in
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {evacuees.data.items.map((p) => (
                <tr key={p.id} className={p.checkedOutAt ? 'text-slate-400' : undefined}>
                  <td className="px-4 py-3 font-medium">
                    {p.fullName}
                    {p.medicalNotes && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-red-700">
                        <Stethoscope className="size-3.5" aria-hidden /> {p.medicalNotes}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.age ?? '–'} · {humanize(p.gender)}
                  </td>
                  <td className="px-4 py-3">{p.homeAddress ?? '–'}</td>
                  <td className="px-4 py-3">{formatDateTime(p.checkedInAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {p.checkedOutAt ? (
                      <span className="text-xs">Left {formatDateTime(p.checkedOutAt)}</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={checkOut.isPending}
                        onClick={() => {
                          if (!window.confirm(`Check out ${p.fullName}?`)) return;
                          checkOut.mutate(p.id, {
                            onSuccess: () => toast(`${p.fullName} checked out`),
                            onError: (err) => toast(errorMessage(err), 'error'),
                          });
                        }}
                      >
                        Check out
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {evacuees.data && (
        <Pagination
          total={evacuees.data.total}
          limit={LIMIT}
          offset={offset}
          onChange={setOffset}
        />
      )}
    </div>
  );
}

/**
 * Families arrive together, so after each check-in we show a FRESH form (new `key` =
 * React throws the old one away) that remembers only the home address.
 */
function CheckInForm({ campId, onDone }: { campId: string; onDone: () => void }) {
  const [round, setRound] = useState({ key: 0, homeAddress: undefined as string | undefined });
  return (
    <CheckInFields
      key={round.key}
      campId={campId}
      homeAddress={round.homeAddress}
      onDone={onDone}
      onCheckedIn={(homeAddress) => setRound((r) => ({ key: r.key + 1, homeAddress }))}
    />
  );
}

function CheckInFields({
  campId,
  homeAddress,
  onDone,
  onCheckedIn,
}: {
  campId: string;
  homeAddress?: string;
  onDone: () => void;
  onCheckedIn: (homeAddress?: string) => void;
}) {
  const checkIn = useCheckIn();
  const online = useOnline();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState, setError } = useZodForm(createEvacueeSchema, {
    gender: 'UNDISCLOSED',
    homeAddress,
  });
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    checkIn.mutate(queueable({ ...values, campId }), {
      onSuccess: (p) => {
        toast(`${p.fullName} checked in`);
        onCheckedIn(values.homeAddress);
      },
      onError: (err) => setFormError(applyServerErrors(err, setError)),
    });
    // Offline: the check-in waits in the outbox and is sent automatically later
    // (capacity is still enforced by the server then). Free the form for the next person.
    if (!online) {
      toast(`${values.fullName} saved on this device - will be checked in when back online`);
      onCheckedIn(values.homeAddress);
    }
  });

  return (
    <Card>
      <h2 className="mb-4 font-semibold">Check in</h2>
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-6">
        <div className="sm:col-span-6">
          <FormError message={formError} />
        </div>
        <Field
          label="Full name"
          required
          error={errors.fullName?.message}
          className="sm:col-span-3"
        >
          {(a) => <Input {...a} autoFocus {...register('fullName')} />}
        </Field>
        <Field label="Age" error={errors.age?.message} className="sm:col-span-1">
          {(a) => (
            <Input
              {...a}
              type="number"
              min={0}
              inputMode="numeric"
              {...register('age', { setValueAs: toOptionalNumber })}
            />
          )}
        </Field>
        <Field label="Gender" error={errors.gender?.message} className="sm:col-span-2">
          {(a) => (
            <Select {...a} {...register('gender')}>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {humanize(g)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Phone" error={errors.phone?.message} className="sm:col-span-2">
          {(a) => (
            <Input {...a} type="tel" {...register('phone', { setValueAs: emptyToUndefined })} />
          )}
        </Field>
        <Field
          label="Home address / village"
          error={errors.homeAddress?.message}
          className="sm:col-span-4"
        >
          {(a) => <Input {...a} {...register('homeAddress', { setValueAs: emptyToUndefined })} />}
        </Field>
        <Field
          label="Medical notes"
          hint="Allergies, medication, mobility needs"
          error={errors.medicalNotes?.message}
          className="sm:col-span-6"
        >
          {(a) => (
            <Textarea
              {...a}
              rows={2}
              className="min-h-0"
              {...register('medicalNotes', { setValueAs: emptyToUndefined })}
            />
          )}
        </Field>
        <div className="flex gap-2 sm:col-span-6">
          <Button type="submit" loading={checkIn.isPending}>
            Check in
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Close
          </Button>
        </div>
      </form>
    </Card>
  );
}
