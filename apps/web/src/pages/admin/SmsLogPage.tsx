import { SMS_STATUSES } from '@crisislink/shared';
import { EnumSelect } from '../../components/filters';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Spinner,
} from '../../components/ui';
import { useFilterParams } from '../../lib/filter-params';
import { formatNumber, humanize, statusTone, timeAgo } from '../../lib/format';
import { useAlertStats, useSmsLog } from '../../lib/queries';

const LIMIT = 50;

/** Admin view of the SMS outbox: is the worker keeping up, and is anything failing? */
export default function SmsLogPage() {
  const { values, query, offset, set } = useFilterParams(['status'] as const);
  const log = useSmsLog({ ...query, limit: LIMIT, offset });
  const stats = useAlertStats();

  return (
    <div>
      <PageHeader
        title="SMS alerts"
        description="Subscribers per district and every message the outbox worker has handled."
      />

      {stats.data && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-slate-600">Verified subscribers</h2>
            {stats.data.subscribers.length === 0 ? (
              <p className="text-sm text-slate-500">Nobody has signed up yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {stats.data.subscribers.map((s) => (
                  <li key={s.slug} className="flex justify-between">
                    <span>{s.district}</span>
                    <span className="font-medium">{formatNumber(s.count)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-slate-600">Messages</h2>
            <dl className="grid grid-cols-4 gap-2 text-center">
              {SMS_STATUSES.map((s) => (
                <div key={s}>
                  <dt className="text-xs text-slate-500">{humanize(s)}</dt>
                  <dd className="text-xl font-semibold">{formatNumber(stats.data.sms[s])}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}

      <div className="mb-4">
        <EnumSelect
          label="Status"
          value={values.status}
          options={SMS_STATUSES}
          onChange={(v) => set('status', v)}
        />
      </div>

      <Card className="overflow-x-auto p-0">
        {log.isPending ? (
          <Spinner />
        ) : log.isError ? (
          <div className="p-5">
            <ErrorState error={log.error} onRetry={() => log.refetch()} />
          </div>
        ) : log.data.items.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No messages" />
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">
                  To
                </th>
                <th scope="col" className="px-4 py-3">
                  Message
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  Queued
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {log.data.items.map((m) => (
                <tr key={m.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{m.to}</td>
                  <td className="px-4 py-3">
                    <Badge tone={m.purpose === 'OTP' ? 'neutral' : 'danger'}>
                      {m.purpose === 'OTP' ? 'Code' : 'Alert'}
                    </Badge>
                    <p className="mt-1 break-words text-slate-700">{m.body}</p>
                    {m.lastError && <p className="mt-1 text-xs text-red-700">{m.lastError}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(m.status)}>{humanize(m.status)}</Badge>
                    {m.attempts > 1 && (
                      <div className="mt-1 text-xs text-slate-500">{m.attempts} attempts</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {timeAgo(m.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {log.data && (
        <Pagination
          total={log.data.total}
          limit={LIMIT}
          offset={offset}
          onChange={(o) => set('offset', o)}
        />
      )}
    </div>
  );
}
