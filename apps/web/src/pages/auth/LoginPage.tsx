import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { loginSchema } from '@crisislink/shared';
import { Button, Card, Field, FormError, Input } from '../../components/ui';
import { useCurrentUser, useLogin } from '../../lib/auth';
import { useZodForm } from '../../lib/forms';

/** Only follow ?next= to our own pages - never to another site (open-redirect protection). */
const safeNext = (next: string | null) =>
  next && next.startsWith('/') && !next.startsWith('//') ? next : null;

export default function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const login = useLogin();
  const { data: user } = useCurrentUser();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useZodForm(loginSchema);
  const next = safeNext(params.get('next'));

  if (user && !login.isPending && !login.isSuccess) return <Navigate to={next ?? '/'} replace />;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    login.mutate(values, {
      onSuccess: (u) =>
        navigate(
          next ??
            (u.role === 'VOLUNTEER'
              ? '/tasks'
              : u.role === 'ADMIN' || u.role === 'COORDINATOR'
                ? '/manage'
                : '/'),
          {
            replace: true,
          },
        ),
      onError: (err) => setFormError(err.message),
    });
  });

  return (
    <div className="mx-auto max-w-sm py-6">
      <h1 className="mb-6 text-center text-2xl font-bold">Log in to CrisisLink</h1>
      <Card>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormError message={formError} />
          <Field label="Email" error={formState.errors.email?.message}>
            {(a) => (
              <Input {...a} type="email" autoComplete="email" autoFocus {...register('email')} />
            )}
          </Field>
          <Field label="Password" error={formState.errors.password?.message}>
            {(a) => (
              <Input
                {...a}
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
            )}
          </Field>
          <Button type="submit" loading={login.isPending}>
            Log in
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-slate-600">
        Want to help?{' '}
        <Link to="/register" className="font-medium text-slate-900 underline">
          Sign up as a volunteer
        </Link>
      </p>
    </div>
  );
}
