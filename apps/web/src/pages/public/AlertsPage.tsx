import { useState } from 'react';
import { BellRing, CheckCircle2, MessageSquareText } from 'lucide-react';
import {
  subscribeAlertsSchema,
  verifyAlertsSchema,
  type SubscribeAlertsResponse,
} from '@crisislink/shared';
import { DistrictOptions } from '../../components/filters';
import { Button, ButtonLink, Card, Field, FormError, Input, Select } from '../../components/ui';
import { applyServerErrors, useZodForm } from '../../lib/forms';
import { useSubscribeAlerts, useVerifyAlerts } from '../../lib/queries';

/**
 * SMS alert sign-up in two steps (double opt-in):
 *  1. phone + district -> the server texts a 6-digit code
 *  2. type the code -> alerts are switched on
 * SMS reaches basic phones with no data connection - often all that works in a disaster.
 */
export default function AlertsPage() {
  const [pending, setPending] = useState<SubscribeAlertsResponse | null>(null);
  const [done, setDone] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-lg py-2">
      <div className="mb-6 flex items-start gap-3">
        <BellRing className="mt-1 size-6 shrink-0 text-red-600" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold">SMS alerts for your district</h1>
          <p className="mt-1 text-slate-600">
            Get a text message when officials confirm a serious flood, landslide or other emergency
            in your district. Works on any phone, even without internet. Free, and you can stop any
            time.
          </p>
        </div>
      </div>

      {done ? (
        <Card className="text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" aria-hidden />
          <h2 className="mt-3 text-xl font-bold" role="status">
            Alerts are on for {done}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Every alert ends with a link to stop them. In an emergency, call 112.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setDone(null);
                setPending(null);
              }}
            >
              Add another district
            </Button>
            <ButtonLink to="/">Back to dashboard</ButtonLink>
          </div>
        </Card>
      ) : pending ? (
        <VerifyStep
          pending={pending}
          onBack={() => setPending(null)}
          onVerified={(district) => setDone(district)}
        />
      ) : (
        <RequestStep onSent={setPending} />
      )}
    </div>
  );
}

function RequestStep({ onSent }: { onSent: (r: SubscribeAlertsResponse) => void }) {
  const subscribe = useSubscribeAlerts();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState, setError } = useZodForm(subscribeAlertsSchema);
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    subscribe.mutate(values, {
      onSuccess: onSent,
      onError: (err) => setFormError(applyServerErrors(err, setError)),
    });
  });

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={formError} />
        <Field label="Mobile number" required error={errors.phone?.message}>
          {(a) => (
            <Input
              {...a}
              type="tel"
              autoComplete="tel"
              placeholder="10-digit mobile number"
              {...register('phone')}
            />
          )}
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
        <Button type="submit" loading={subscribe.isPending}>
          <MessageSquareText className="size-4" aria-hidden /> Text me a code
        </Button>
        <p className="text-xs text-slate-500">
          We only use your number for these alerts. Standard SMS rules apply.
        </p>
      </form>
    </Card>
  );
}

function VerifyStep({
  pending,
  onBack,
  onVerified,
}: {
  pending: SubscribeAlertsResponse;
  onBack: () => void;
  onVerified: (district: string) => void;
}) {
  const verify = useVerifyAlerts();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState, setError } = useZodForm(verifyAlertsSchema, {
    subscriptionId: pending.subscriptionId,
  });
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    verify.mutate(values, {
      onSuccess: (r) => onVerified(r.district.name),
      onError: (err) => setFormError(applyServerErrors(err, setError)),
    });
  });

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <p className="text-sm text-slate-700" role="status">
          We sent a 6-digit code to <strong>{pending.sentTo}</strong>. It may take a minute to
          arrive and expires in 10 minutes.
        </p>
        <FormError message={formError} />
        <Field label="Code" required error={errors.code?.message}>
          {(a) => (
            <Input
              {...a}
              // one-time-code lets phones offer the code from the SMS automatically
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              className="text-center text-lg tracking-[0.5em]"
              autoFocus
              {...register('code')}
            />
          )}
        </Field>
        <div className="flex gap-2">
          <Button type="submit" loading={verify.isPending}>
            Turn on alerts
          </Button>
          <Button variant="ghost" onClick={onBack}>
            Use a different number
          </Button>
        </div>
      </form>
    </Card>
  );
}
