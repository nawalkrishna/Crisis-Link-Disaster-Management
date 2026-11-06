import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { registerSchema } from '@crisislink/shared';
import { DistrictOptions } from '../../components/filters';
import { Button, Card, Field, FormError, Input, Select } from '../../components/ui';
import { useRegister } from '../../lib/auth';
import { applyServerErrors, emptyToUndefined, useZodForm } from '../../lib/forms';
import { SkillCheckboxes } from './SkillCheckboxes';

export default function RegisterPage() {
  const registerUser = useRegister();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState, setError, control } = useZodForm(registerSchema, {
    skills: [],
  });
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    registerUser.mutate(values, {
      onSuccess: () => navigate('/tasks', { replace: true }),
      onError: (err) => setFormError(applyServerErrors(err, setError)),
    });
  });

  return (
    <div className="mx-auto max-w-xl py-2">
      <h1 className="text-2xl font-bold">Volunteer with CrisisLink</h1>
      <p className="mt-1 mb-6 text-slate-600">
        After you sign up, a coordinator will approve your account. Then you can pick up tasks near
        you.
      </p>
      <Card>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormError message={formError} />
          <Field label="Full name" required error={errors.fullName?.message}>
            {(a) => <Input {...a} autoComplete="name" {...register('fullName')} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" required error={errors.email?.message}>
              {(a) => <Input {...a} type="email" autoComplete="email" {...register('email')} />}
            </Field>
            <Field label="Mobile number" required error={errors.phone?.message}>
              {(a) => <Input {...a} type="tel" autoComplete="tel" {...register('phone')} />}
            </Field>
          </div>
          <Field
            label="Password"
            required
            hint="At least 10 characters. A short sentence works well."
            error={errors.password?.message}
          >
            {(a) => (
              <Input {...a} type="password" autoComplete="new-password" {...register('password')} />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="District you can help in" required error={errors.district?.message}>
              {(a) => (
                <Select {...a} defaultValue="" {...register('district')}>
                  <option value="" disabled>
                    Choose a district
                  </option>
                  <DistrictOptions />
                </Select>
              )}
            </Field>
            <Field label="Hometown" error={errors.hometown?.message}>
              {(a) => <Input {...a} {...register('hometown', { setValueAs: emptyToUndefined })} />}
            </Field>
          </div>
          <SkillCheckboxes control={control} />
          <Button type="submit" loading={registerUser.isPending}>
            Sign up
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-slate-600">
        Already registered?{' '}
        <Link to="/login" className="font-medium text-slate-900 underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
