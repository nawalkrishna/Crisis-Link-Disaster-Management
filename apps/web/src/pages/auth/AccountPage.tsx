import { useState } from 'react';
import { changePasswordSchema, updateProfileSchema, type CurrentUser } from '@crisislink/shared';
import { DistrictOptions } from '../../components/filters';
import { useToast } from '../../components/toast-context';
import {
  Badge,
  Button,
  Card,
  Field,
  FormError,
  Input,
  PageHeader,
  PageLoader,
  Select,
} from '../../components/ui';
import { useCurrentUser } from '../../lib/auth';
import { applyServerErrors, emptyToUndefined, useZodForm } from '../../lib/forms';
import { humanize, statusTone } from '../../lib/format';
import { useChangePassword, useUpdateProfile } from '../../lib/queries';
import { SkillCheckboxes } from './SkillCheckboxes';

export default function AccountPage() {
  const { data: user } = useCurrentUser();
  if (!user) return <PageLoader />;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Your account"
        description={
          <span className="flex flex-wrap items-center gap-2">
            {user.email} <Badge>{humanize(user.role)}</Badge>
            <Badge tone={statusTone(user.status)}>{humanize(user.status)}</Badge>
          </span>
        }
      />
      <ProfileForm user={user} />
      <PasswordForm />
    </div>
  );
}

function ProfileForm({ user }: { user: CurrentUser }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const v = user.volunteer;
  const { register, handleSubmit, formState, setError, control } = useZodForm(updateProfileSchema, {
    fullName: user.fullName,
    phone: user.phone ?? undefined,
    ...(v && {
      district: v.district.slug,
      hometown: v.hometown ?? undefined,
      skills: v.skills,
      available: v.available,
    }),
  });
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    update.mutate(values, {
      onSuccess: () => toast('Profile saved'),
      onError: (err) => setFormError(applyServerErrors(err, setError)),
    });
  });

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Profile</h2>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={formError} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={errors.fullName?.message}>
            {(a) => <Input {...a} {...register('fullName')} />}
          </Field>
          <Field label="Mobile number" error={errors.phone?.message}>
            {(a) => (
              <Input {...a} type="tel" {...register('phone', { setValueAs: emptyToUndefined })} />
            )}
          </Field>
        </div>
        {v && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="District" error={errors.district?.message}>
                {(a) => (
                  <Select {...a} {...register('district')}>
                    <DistrictOptions />
                  </Select>
                )}
              </Field>
              <Field label="Hometown" error={errors.hometown?.message}>
                {(a) => (
                  <Input {...a} {...register('hometown', { setValueAs: emptyToUndefined })} />
                )}
              </Field>
            </div>
            <SkillCheckboxes control={control} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-slate-900"
                {...register('available')}
              />
              I’m available for new tasks
            </label>
          </>
        )}
        <div>
          <Button type="submit" loading={update.isPending}>
            Save profile
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const change = useChangePassword();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState, setError, reset } = useZodForm(changePasswordSchema);
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    change.mutate(values, {
      onSuccess: (r) => {
        reset({ currentPassword: '', newPassword: '' });
        toast(
          r.otherSessionsRevoked > 0
            ? `Password changed. Logged out ${r.otherSessionsRevoked} other device(s).`
            : 'Password changed.',
        );
      },
      onError: (err) => setFormError(applyServerErrors(err, setError)),
    });
  });

  return (
    <Card>
      <h2 className="text-lg font-semibold">Change password</h2>
      <p className="mb-4 text-sm text-slate-600">This also logs you out on all other devices.</p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={formError} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password" error={errors.currentPassword?.message}>
            {(a) => (
              <Input
                {...a}
                type="password"
                autoComplete="current-password"
                {...register('currentPassword')}
              />
            )}
          </Field>
          <Field
            label="New password"
            hint="At least 10 characters."
            error={errors.newPassword?.message}
          >
            {(a) => (
              <Input
                {...a}
                type="password"
                autoComplete="new-password"
                {...register('newPassword')}
              />
            )}
          </Field>
        </div>
        <div>
          <Button type="submit" variant="secondary" loading={change.isPending}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}
