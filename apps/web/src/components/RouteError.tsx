import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ButtonLink } from './ui';

/** Shown when a page crashes or fails to load (e.g. an old code chunk after a redeploy). */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-slate-600">{message}</p>
      <ButtonLink to="/" className="mt-6">
        Back to the dashboard
      </ButtonLink>
    </div>
  );
}
