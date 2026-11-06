import { INCIDENT_STATUSES, PRIORITIES, type IncidentStatus } from '@crisislink/shared';
import { IncidentCard } from '../../components/domain';
import { DistrictFilter, EnumSelect } from '../../components/filters';
import { useFilterParams } from '../../lib/filter-params';
import { useToast } from '../../components/toast-context';
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Spinner,
} from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { isStaff, useCurrentUser } from '../../lib/auth';
import { humanize } from '../../lib/format';
import { useIncidents, useUpdateIncident } from '../../lib/queries';

const LIMIT = 20;

/** Staff can move a report forward; the API enforces who may do this. */
const NEXT_ACTIONS: Record<IncidentStatus, IncidentStatus[]> = {
  REPORTED: ['VERIFIED', 'DISMISSED'],
  VERIFIED: ['RESOLVED'],
  RESOLVED: [],
  DISMISSED: ['REPORTED'],
};

export default function IncidentsPage() {
  const { values, query, offset, set } = useFilterParams([
    'district',
    'status',
    'severity',
  ] as const);
  const incidents = useIncidents({
    ...query,
    active: values.status ? undefined : true,
    limit: LIMIT,
    offset,
  });
  const { data: user } = useCurrentUser();
  const staff = isStaff(user);
  const update = useUpdateIncident();
  const toast = useToast();

  const move = (id: string, status: IncidentStatus) =>
    update.mutate(
      { id, status },
      {
        onSuccess: () => toast(`Marked as ${humanize(status).toLowerCase()}`),
        onError: (err) => toast(errorMessage(err), 'error'),
      },
    );

  return (
    <div>
      <PageHeader
        title="Incidents"
        description={values.status ? undefined : 'Showing reports that still need attention.'}
        actions={
          <ButtonLink to="/report" variant="emergency">
            Report an incident
          </ButtonLink>
        }
      />
      <div className="mb-5 flex flex-wrap gap-3">
        <DistrictFilter value={values.district} onChange={(v) => set('district', v)} />
        <EnumSelect
          label="Status"
          value={values.status}
          options={INCIDENT_STATUSES}
          onChange={(v) => set('status', v)}
          allLabel="Active"
        />
        <EnumSelect
          label="Severity"
          value={values.severity}
          options={PRIORITIES}
          onChange={(v) => set('severity', v)}
        />
      </div>

      {incidents.isPending ? (
        <Spinner />
      ) : incidents.isError ? (
        <ErrorState error={incidents.error} onRetry={() => incidents.refetch()} />
      ) : incidents.data.items.length === 0 ? (
        <EmptyState title="No incidents match these filters" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {incidents.data.items.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              actions={
                staff &&
                NEXT_ACTIONS[incident.status].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={status === 'DISMISSED' ? 'danger' : 'secondary'}
                    disabled={update.isPending}
                    onClick={() => move(incident.id, status)}
                  >
                    {status === 'VERIFIED'
                      ? 'Verify'
                      : status === 'RESOLVED'
                        ? 'Mark resolved'
                        : status === 'DISMISSED'
                          ? 'Dismiss'
                          : 'Reopen'}
                  </Button>
                ))
              }
            />
          ))}
        </div>
      )}
      {incidents.data && (
        <Pagination
          total={incidents.data.total}
          limit={LIMIT}
          offset={offset}
          onChange={(o) => set('offset', o)}
        />
      )}
    </div>
  );
}
