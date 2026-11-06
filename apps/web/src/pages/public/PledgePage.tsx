import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { SUPPLY_CATEGORIES, createDonationSchema, type CampNeed } from '@crisislink/shared';
import {
  Button,
  ButtonLink,
  Card,
  Field,
  FormError,
  Input,
  PageHeader,
  PageLoader,
  Select,
} from '../../components/ui';
import { api } from '../../lib/api';
import { applyServerErrors, emptyToUndefined, useZodForm } from '../../lib/forms';
import { formatNumber, humanize } from '../../lib/format';
import { useCamp, usePledge } from '../../lib/queries';

export default function PledgePage() {
  const [params] = useSearchParams();
  const needId = params.get('needId') ?? undefined;
  const campId = params.get('campId') ?? undefined;

  const need = useQuery({
    queryKey: ['needs', 'detail', needId],
    queryFn: () => api<CampNeed>(`/needs/${needId}`),
    enabled: Boolean(needId),
  });
  const camp = useCamp(campId ?? '');

  if (needId && need.isPending) return <PageLoader />;
  // `key` remounts the form when the target changes, so default values are re-applied.
  return (
    <PledgeForm
      key={needId ?? campId ?? 'general'}
      need={need.data}
      campName={campId ? camp.data?.name : undefined}
      campId={campId}
    />
  );
}

function PledgeForm({
  need,
  campId,
  campName,
}: {
  need?: CampNeed;
  campId?: string;
  campName?: string;
}) {
  const pledge = usePledge();
  const [formError, setFormError] = useState<string | null>(null);
  const remaining = need ? Math.max(1, need.quantityNeeded - need.quantityFulfilled) : undefined;

  const form = useZodForm(createDonationSchema, {
    needId: need?.id,
    campId: need ? undefined : campId,
    category: need?.category ?? 'FOOD',
    item: need?.item ?? '',
    quantity: remaining,
  });
  const { register, handleSubmit, formState, setError, reset } = form;
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    pledge.mutate(values, { onError: (err) => setFormError(applyServerErrors(err, setError)) });
  });

  if (pledge.isSuccess) {
    const d = pledge.data;
    return (
      <Card className="mx-auto max-w-lg text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" aria-hidden />
        <h1 className="mt-3 text-xl font-bold">Thank you, {d.donorName}!</h1>
        <p className="mt-2 text-slate-600">
          Your pledge of {formatNumber(d.quantity)} × {d.item}
          {d.camp && (
            <>
              {' '}
              for <strong>{d.camp.name}</strong>
            </>
          )}{' '}
          is recorded. The camp team will mark it received when it arrives.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink to="/needs" variant="secondary">
            See other needs
          </ButtonLink>
          <Button
            onClick={() => {
              pledge.reset();
              reset();
            }}
          >
            Pledge again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Pledge a donation"
        back={{ to: '/needs', label: 'All needs' }}
        description={
          need ? (
            <>
              For <strong>{need.camp?.name}</strong>: {need.item} ({formatNumber(remaining ?? 0)}{' '}
              {need.unit} still needed)
            </>
          ) : campName ? (
            <>
              General donation to <strong>{campName}</strong>
            </>
          ) : (
            'A general donation; coordinators will route it to the camp that needs it most.'
          )
        }
      />
      <Card>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormError message={formError} />
          <Field label="Your name (or organisation)" required error={errors.donorName?.message}>
            {(a) => <Input {...a} autoComplete="name" {...register('donorName')} />}
          </Field>
          <Field
            label="Phone"
            hint="So the camp can coordinate delivery."
            error={errors.donorPhone?.message}
          >
            {(a) => (
              <Input
                {...a}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                {...register('donorPhone', { setValueAs: emptyToUndefined })}
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" required error={errors.category?.message}>
              {(a) => (
                <Select {...a} disabled={Boolean(need)} {...register('category')}>
                  {SUPPLY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {humanize(c)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Quantity" required error={errors.quantity?.message}>
              {(a) => (
                <Input
                  {...a}
                  type="number"
                  min={1}
                  inputMode="numeric"
                  {...register('quantity', { valueAsNumber: true })}
                />
              )}
            </Field>
          </div>
          <Field label="Item" required error={errors.item?.message}>
            {(a) => <Input {...a} placeholder="e.g. Rice (kg), blankets" {...register('item')} />}
          </Field>
          <Button type="submit" loading={pledge.isPending}>
            Pledge
          </Button>
        </form>
      </Card>
    </div>
  );
}
