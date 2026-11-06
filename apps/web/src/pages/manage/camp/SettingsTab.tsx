import { useState } from 'react';
import { CAMP_STATUSES, updateCampSchema, type CampSummary } from '@crisislink/shared';
import { useToast } from '../../../components/toast-context';
import { Button, Card, Field, FormError, Input, Select } from '../../../components/ui';
import {
  applyServerErrors,
  emptyToUndefined,
  toOptionalNumber,
  useZodForm,
} from '../../../lib/forms';
import { humanize } from '../../../lib/format';
import { useUpdateCamp } from '../../../lib/queries';

export function SettingsTab({ camp }: { camp: CampSummary }) {
  const update = useUpdateCamp(camp.id);
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState, setError } = useZodForm(updateCampSchema, {
    name: camp.name,
    address: camp.address,
    capacity: camp.capacity,
    status: camp.status,
    contactName: camp.contactName ?? undefined,
    contactPhone: camp.contactPhone ?? undefined,
    latitude: camp.latitude ?? undefined,
    longitude: camp.longitude ?? undefined,
  });
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    update.mutate(values, {
      onSuccess: () => toast('Camp updated'),
      onError: (err) => setFormError(applyServerErrors(err, setError)),
    });
  });

  return (
    <Card className="max-w-2xl">
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormError message={formError} />
        </div>
        <Field label="Camp name" error={errors.name?.message} className="sm:col-span-2">
          {(a) => <Input {...a} {...register('name')} />}
        </Field>
        <Field label="Address" error={errors.address?.message} className="sm:col-span-2">
          {(a) => <Input {...a} {...register('address')} />}
        </Field>
        <Field label="Capacity" error={errors.capacity?.message}>
          {(a) => (
            <Input
              {...a}
              type="number"
              min={1}
              {...register('capacity', { valueAsNumber: true })}
            />
          )}
        </Field>
        <Field
          label="Status"
          hint="FULL is also set automatically at capacity."
          error={errors.status?.message}
        >
          {(a) => (
            <Select {...a} {...register('status')}>
              {CAMP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Contact name" error={errors.contactName?.message}>
          {(a) => <Input {...a} {...register('contactName', { setValueAs: emptyToUndefined })} />}
        </Field>
        <Field
          label="Contact phone"
          hint="Shown publicly on the camp page."
          error={errors.contactPhone?.message}
        >
          {(a) => (
            <Input
              {...a}
              type="tel"
              {...register('contactPhone', { setValueAs: emptyToUndefined })}
            />
          )}
        </Field>
        <Field label="Latitude" error={errors.latitude?.message}>
          {(a) => (
            <Input
              {...a}
              inputMode="decimal"
              {...register('latitude', { setValueAs: toOptionalNumber })}
            />
          )}
        </Field>
        <Field label="Longitude" error={errors.longitude?.message}>
          {(a) => (
            <Input
              {...a}
              inputMode="decimal"
              {...register('longitude', { setValueAs: toOptionalNumber })}
            />
          )}
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" loading={update.isPending} disabled={!formState.isDirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}
