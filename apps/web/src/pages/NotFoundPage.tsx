import { ButtonLink } from '../components/ui';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm font-semibold text-red-600">404</p>
      <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600">The link may be old, or the item was removed.</p>
      <ButtonLink to="/" className="mt-6">
        Go to the dashboard
      </ButtonLink>
    </div>
  );
}
