import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createCampSchema } from '@crisislink/shared';
import { DistrictOptions } from '../../components/filters';
import { LocationPicker } from '../../components/map';
import { pickOptions, toPoint } from '../../components/map/map-style';
import { useToast } from '../../components/toast-context';
import { Button, Card, Field, FormError, Input, PageHeader, Select } from '../../components/ui';
import { applyServerErrors, emptyToUndefined, toOptionalNumber, useZodForm } from '../../lib/forms';
import { useCreateCamp } from '../../lib/queries';

export default function NewCampPage() {
  const create = useCreateCamp();
  const navigate = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState, setError, setValue, watch } =
    useZodForm(createCampSchema);
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    create.mutate(values, {
      onSuccess: (camp) => {
        toast(`${camp.name} is open`);
        navigate(`/manage/camps/${camp.id}`);
      },
      onError: (err) => setFormError(applyServerErrors(err, setError)),
    });
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Open a relief camp" back={{ to: '/manage', label: 'Camps' }} />
      <Card>
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormError message={formError} />
          </div>
          <Field label="Camp name" required error={errors.name?.message} className="sm:col-span-2">
            {(a) => (
              <Input {...a} placeholder="e.g. GLPS Chooralmala Relief Camp" {...register('name')} />
            )}
          </Field>
          <Field label="Address" required error={errors.address?.message} className="sm:col-span-2">
            {(a) => <Input {...a} {...register('address')} />}
          </Field>
          <Field label="District" required error={errors.district?.message}>
            {(a) => (
              <Select {...a} defaultValue="" {...register('district')}>
                <option value="" disabled>
                  Choose a district
                </option>
                <DistrictOptions />
              </Select>
            )}
          </Field>
          <Field label="Capacity (people)" required error={errors.capacity?.message}>
            {(a) => (
              <Input
                {...a}
                type="number"
                min={1}
                {...register('capacity', { valueAsNumber: true })}
              />
            )}
          </Field>
          <Field label="Contact name" error={errors.contactName?.message}>
            {(a) => <Input {...a} {...register('contactName', { setValueAs: emptyToUndefined })} />}
          </Field>
          <Field label="Contact phone" error={errors.contactPhone?.message}>
            {(a) => (
              <Input
                {...a}
                type="tel"
                {...register('contactPhone', { setValueAs: emptyToUndefined })}
              />
            )}
          </Field>
          <Field label="Latitude" hint="Optional, for the map" error={errors.latitude?.message}>
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
            <LocationPicker
              value={toPoint(watch('latitude'), watch('longitude'))}
              onChange={(p) => {
                setValue('latitude', p.latitude, pickOptions);
                setValue('longitude', p.longitude, pickOptions);
              }}
            />
            <p className="mt-1 text-xs text-slate-500">
              Click the map (or drag the pin) to fill in latitude and longitude.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" loading={create.isPending}>
              Open camp
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
