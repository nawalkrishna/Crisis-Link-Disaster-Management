import { useState } from 'react';
import { CheckCircle2, LocateFixed, PhoneCall } from 'lucide-react';
import { INCIDENT_TYPES, PRIORITIES, createIncidentSchema } from '@crisislink/shared';
import { DistrictOptions } from '../../components/filters';
import { LocationPicker } from '../../components/map';
import { pickOptions, toPoint } from '../../components/map/map-style';
import {
  Button,
  ButtonLink,
  Card,
  Field,
  FormError,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '../../components/ui';
import { useCurrentUser } from '../../lib/auth';
import { applyServerErrors, emptyToUndefined, useZodForm } from '../../lib/forms';
import { humanize } from '../../lib/format';
import { useGeolocation } from '../../lib/geolocation';
import { useReportIncident } from '../../lib/queries';

export default function ReportIncidentPage() {
  const report = useReportIncident();
  const { data: user } = useCurrentUser();
  const [formError, setFormError] = useState<string | null>(null);
  const geo = useGeolocation();

  const { register, handleSubmit, formState, setError, setValue, watch, reset } = useZodForm(
    createIncidentSchema,
    { severity: 'HIGH', type: 'FLOOD', reporterName: user?.fullName },
  );
  const errors = formState.errors;
  const point = toPoint(watch('latitude'), watch('longitude'));

  const setPoint = (p: { latitude: number; longitude: number }) => {
    setValue('latitude', p.latitude, pickOptions);
    setValue('longitude', p.longitude, pickOptions);
  };
  /** Use the phone's GPS - the most accurate option when you're at the scene. */
  const attachLocation = async () => {
    const position = await geo.locate();
    if (position) setPoint(position);
  };

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    report.mutate(values, { onError: (err) => setFormError(applyServerErrors(err, setError)) });
  });

  if (report.isSuccess) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" aria-hidden />
        <h1 className="mt-3 text-xl font-bold">Report received</h1>
        <p className="mt-2 text-slate-600">
          Coordinators in {report.data.district.name} can see it now. If anyone is in immediate
          danger, also call{' '}
          <a href="tel:112" className="font-semibold underline">
            112
          </a>
          .
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink to="/incidents" variant="secondary">
            View incidents
          </ButtonLink>
          <Button
            onClick={() => {
              report.reset();
              reset();
              geo.setPosition(null);
            }}
          >
            Report another
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Report an incident"
        description="No login needed. Keep it short and specific."
      />
      <div className="mb-5 flex items-center gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200">
        <PhoneCall className="size-5 shrink-0" aria-hidden />
        <span>
          Life in danger right now? Call{' '}
          <a href="tel:112" className="font-bold underline">
            112
          </a>{' '}
          first, then report here.
        </span>
      </div>
      <Card>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormError message={formError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="What happened?" required error={errors.type?.message}>
              {(a) => (
                <Select {...a} {...register('type')}>
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {humanize(t)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="How serious?" required error={errors.severity?.message}>
              {(a) => (
                <Select {...a} {...register('severity')}>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {humanize(p)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
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
          <Field
            label="Where exactly?"
            required
            hint="Village, landmark, road…"
            error={errors.locationText?.message}
          >
            {(a) => <Input {...a} {...register('locationText')} />}
          </Field>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void attachLocation()}
                loading={geo.locating}
              >
                <LocateFixed className="size-4" aria-hidden />
                {point ? 'Use my location instead' : 'Use my location'}
              </Button>
              <span className="text-xs text-slate-600" role="status">
                {geo.error
                  ? `${geo.error} Tap the map instead.`
                  : point
                    ? `Pinned at ${point.latitude}, ${point.longitude}${geo.position ? ` (±${geo.position.accuracy} m)` : ''}`
                    : 'or tap the map where it is happening (optional)'}
              </span>
            </div>
            <LocationPicker value={point} onChange={setPoint} className="h-56" />
          </div>
          <Field
            label="Description"
            required
            hint="What do you see? How many people are affected?"
            error={errors.description?.message}
          >
            {(a) => <Textarea {...a} rows={4} {...register('description')} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" error={errors.reporterName?.message}>
              {(a) => (
                <Input
                  {...a}
                  autoComplete="name"
                  {...register('reporterName', { setValueAs: emptyToUndefined })}
                />
              )}
            </Field>
            <Field
              label="Your phone"
              hint="Only coordinators can see it."
              error={errors.reporterPhone?.message}
            >
              {(a) => (
                <Input
                  {...a}
                  type="tel"
                  autoComplete="tel"
                  {...register('reporterPhone', { setValueAs: emptyToUndefined })}
                />
              )}
            </Field>
          </div>
          <Button type="submit" variant="emergency" loading={report.isPending}>
            Send report
          </Button>
        </form>
      </Card>
    </div>
  );
}
