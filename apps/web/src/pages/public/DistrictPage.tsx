import { useParams } from 'react-router';
import { CampCard, IncidentCard, StatTile } from '../../components/domain';
import { LiveMapSection } from '../../components/LiveMapSection';
import { EmptyState, ErrorState, PageHeader, PageLoader, Spinner } from '../../components/ui';
import { useCamps, useDistrict, useIncidents } from '../../lib/queries';
import NotFoundPage from '../NotFoundPage';
import { isApiError } from '../../lib/api';

export default function DistrictPage() {
  const { slug = '' } = useParams();
  const district = useDistrict(slug);
  const camps = useCamps({ district: slug, limit: 50 });
  const incidents = useIncidents({ district: slug, active: true, limit: 20 });

  if (district.isPending) return <PageLoader />;
  if (isApiError(district.error, 400) || isApiError(district.error, 404)) return <NotFoundPage />;
  if (district.isError)
    return <ErrorState error={district.error} onRetry={() => district.refetch()} />;

  const d = district.data;
  return (
    <div>
      <PageHeader
        title={d.name}
        description="District overview"
        back={{ to: '/', label: 'Dashboard' }}
      />
      <div className="mb-10 grid grid-cols-3 gap-4">
        <StatTile label="Open camps" value={d.openCamps} />
        <StatTile label="People sheltered" value={d.currentEvacuees} />
        <StatTile
          label="Active incidents"
          value={d.activeIncidents}
          emphasis={d.activeIncidents > 0}
        />
      </div>

      <div className="mb-10">
        <LiveMapSection district={d.slug} />
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-xl font-semibold">Relief camps</h2>
          {camps.isPending ? (
            <Spinner />
          ) : camps.isError ? (
            <ErrorState error={camps.error} />
          ) : camps.data.items.length === 0 ? (
            <EmptyState title={`No relief camps in ${d.name}`} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {camps.data.items.map((camp) => (
                <CampCard key={camp.id} camp={camp} />
              ))}
            </div>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold">Active incidents</h2>
          <div className="space-y-3">
            {incidents.data?.items.length === 0 && <EmptyState title="Nothing reported" />}
            {incidents.data?.items.map((i) => (
              <IncidentCard key={i.id} incident={i} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
