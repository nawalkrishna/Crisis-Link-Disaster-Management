import { useState } from 'react';
import { Phone } from 'lucide-react';
import { DONATION_STATUSES, type CampSummary, type DonationStatus } from '@crisislink/shared';
import { useToast } from '../../../components/toast-context';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Pagination,
  Spinner,
  Tabs,
} from '../../../components/ui';
import { errorMessage } from '../../../lib/api';
import { formatNumber, humanize, statusTone, timeAgo } from '../../../lib/format';
import { useDonations, useUpdateDonation } from '../../../lib/queries';

const LIMIT = 20;

export function DonationsTab({ camp }: { camp: CampSummary }) {
  const [status, setStatus] = useState<DonationStatus>('PLEDGED');
  const [offset, setOffset] = useState(0);
  const donations = useDonations({ campId: camp.id, status, limit: LIMIT, offset });
  const update = useUpdateDonation();
  const toast = useToast();

  return (
    <div>
      <Tabs
        label="Donation status"
        value={status}
        onChange={(s) => {
          setStatus(s);
          setOffset(0);
        }}
        tabs={DONATION_STATUSES.map((s) => ({
          value: s,
          label: s === 'PLEDGED' ? 'Expected' : humanize(s),
        }))}
      />
      {donations.isPending ? (
        <Spinner />
      ) : donations.isError ? (
        <ErrorState error={donations.error} onRetry={() => donations.refetch()} />
      ) : donations.data.items.length === 0 ? (
        <EmptyState
          title={
            status === 'PLEDGED'
              ? 'No deliveries expected'
              : `No ${humanize(status).toLowerCase()} donations`
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {donations.data.items.map((d) => (
            <Card key={d.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {formatNumber(d.quantity)} × {d.item}
                </span>
                <Badge tone={statusTone(d.status)}>{humanize(d.status)}</Badge>
                <span className="ml-auto text-xs text-slate-500">{timeAgo(d.createdAt)}</span>
              </div>
              <p className="text-sm text-slate-600">
                From <strong>{d.donorName}</strong>
                {d.donorPhone && (
                  <a
                    href={`tel:${d.donorPhone}`}
                    className="ml-2 inline-flex items-center gap-1 underline"
                  >
                    <Phone className="size-3.5" aria-hidden /> {d.donorPhone}
                  </a>
                )}
              </p>
              {d.need && <p className="text-xs text-slate-500">For need: {d.need.item}</p>}
              {d.status === 'PLEDGED' && (
                <div className="mt-1 flex gap-2">
                  <Button
                    size="sm"
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate(
                        { id: d.id, status: 'RECEIVED' },
                        {
                          onSuccess: () => toast('Marked as received'),
                          onError: (e) => toast(errorMessage(e), 'error'),
                        },
                      )
                    }
                  >
                    Received
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate(
                        { id: d.id, status: 'CANCELLED' },
                        {
                          onSuccess: () => toast('Pledge cancelled'),
                          onError: (e) => toast(errorMessage(e), 'error'),
                        },
                      )
                    }
                  >
                    Didn’t arrive
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {donations.data && (
        <Pagination
          total={donations.data.total}
          limit={LIMIT}
          offset={offset}
          onChange={setOffset}
        />
      )}
    </div>
  );
}
