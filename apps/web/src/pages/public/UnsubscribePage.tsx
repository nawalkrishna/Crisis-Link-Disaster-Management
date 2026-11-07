import { useParams } from 'react-router';
import { BellOff, CheckCircle2 } from 'lucide-react';
import { Button, ButtonLink, Card, EmptyState, FormError, PageLoader } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { useAlertSubscription, useUnsubscribeAlerts } from '../../lib/queries';

/**
 * Opened from the "Stop alerts" link inside an SMS. Opening the page changes nothing; only the
 * button does - message apps fetch links to build previews, which must not unsubscribe anyone.
 */
export default function UnsubscribePage() {
  const { code = '' } = useParams();
  const subscription = useAlertSubscription(code);
  const unsubscribe = useUnsubscribeAlerts();

  if (subscription.isPending) return <PageLoader />;
  if (subscription.isError && !unsubscribe.isSuccess) {
    return (
      <div className="mx-auto max-w-lg">
        <EmptyState title="This link is no longer active">
          The alerts may already be switched off.
        </EmptyState>
      </div>
    );
  }

  return (
    <Card className="mx-auto max-w-lg text-center">
      {unsubscribe.isSuccess ? (
        <>
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" aria-hidden />
          <h1 className="mt-3 text-xl font-bold" role="status">
            Alerts stopped
          </h1>
          <p className="mt-2 text-slate-600">You won&rsquo;t get more CrisisLink texts.</p>
          <ButtonLink to="/alerts" variant="secondary" className="mt-5">
            Sign up again
          </ButtonLink>
        </>
      ) : (
        <>
          <BellOff className="mx-auto size-10 text-slate-500" aria-hidden />
          <h1 className="mt-3 text-xl font-bold">Stop SMS alerts?</h1>
          <p className="mt-2 text-slate-600">
            {subscription.data?.phone} will stop getting alerts for{' '}
            <strong>{subscription.data?.district}</strong>.
          </p>
          <FormError message={unsubscribe.isError ? errorMessage(unsubscribe.error) : null} />
          <Button
            variant="danger"
            className="mt-5"
            loading={unsubscribe.isPending}
            onClick={() => unsubscribe.mutate(code)}
          >
            Stop alerts
          </Button>
        </>
      )}
    </Card>
  );
}
