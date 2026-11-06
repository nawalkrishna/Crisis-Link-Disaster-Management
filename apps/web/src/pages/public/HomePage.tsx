import { Link } from 'react-router';
import { AlertTriangle, HandHeart, HeartPulse, House, Package, Siren } from 'lucide-react';
import { CampCard, IncidentCard, NeedRow, StatTile } from '../../components/domain';
import { LiveMapSection } from '../../components/LiveMapSection';
import { ButtonLink, Card, EmptyState, ErrorState, Spinner } from '../../components/ui';
import { formatNumber, pluralize } from '../../lib/format';
import { useCamps, useDistricts, useIncidents, useNeeds, useStats } from '../../lib/queries';

export default function HomePage() {
  const stats = useStats();
  const needs = useNeeds({ limit: 5 });
  const incidents = useIncidents({ active: true, limit: 4 });
  const camps = useCamps({ limit: 3 });

  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-slate-900 px-6 py-10 text-white sm:px-10">
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Relief coordination for Kerala, in one place.
        </h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          See which relief camps need what, pledge supplies, report emergencies and volunteer — with
          coordinators updating everything live.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink to="/report" variant="emergency">
            <Siren className="size-4" aria-hidden /> Report an emergency
          </ButtonLink>
          <ButtonLink to="/needs" variant="secondary">
            <HandHeart className="size-4" aria-hidden /> Donate supplies
          </ButtonLink>
          <Link
            to="/register"
            className="inline-flex h-10 items-center px-2 text-sm font-medium underline"
          >
            Become a volunteer
          </Link>
        </div>
      </section>

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Current situation
        </h2>
        {stats.isPending ? (
          <Spinner />
        ) : stats.isError ? (
          <ErrorState error={stats.error} onRetry={() => stats.refetch()} />
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="Open camps"
              value={stats.data.openCamps}
              detail={`${formatNumber(stats.data.totalCapacity)} places in total`}
              icon={<House className="size-4" aria-hidden />}
            />
            <StatTile
              label="People sheltered"
              value={stats.data.currentEvacuees}
              detail={`${Math.round((stats.data.currentEvacuees / Math.max(1, stats.data.totalCapacity)) * 100)}% of capacity`}
              icon={<HeartPulse className="size-4" aria-hidden />}
            />
            <StatTile
              label="Open needs"
              value={stats.data.openNeeds}
              detail={pluralize(stats.data.criticalNeeds, 'critical need')}
              icon={<Package className="size-4" aria-hidden />}
              emphasis={stats.data.criticalNeeds > 0}
            />
            <StatTile
              label="Active incidents"
              value={stats.data.activeIncidents}
              detail={`${stats.data.incidentsBySeverity.CRITICAL} critical`}
              icon={<AlertTriangle className="size-4" aria-hidden />}
              emphasis={stats.data.incidentsBySeverity.CRITICAL > 0}
            />
          </div>
        )}
      </section>

      <LiveMapSection />

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="lg:col-span-3" aria-labelledby="needs-heading">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="needs-heading" className="text-xl font-semibold">
              Most urgent needs
            </h2>
            <Link to="/needs" className="text-sm font-medium text-slate-600 hover:underline">
              All needs →
            </Link>
          </div>
          <Card className="py-0">
            {needs.isPending ? (
              <Spinner />
            ) : needs.isError ? (
              <ErrorState error={needs.error} />
            ) : needs.data.items.length === 0 ? (
              <div className="py-5">
                <EmptyState title="No open needs right now" />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {needs.data.items.map((need) => (
                  <NeedRow key={need.id} need={need} showCamp />
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section className="lg:col-span-2" aria-labelledby="incidents-heading">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="incidents-heading" className="text-xl font-semibold">
              Active incidents
            </h2>
            <Link to="/incidents" className="text-sm font-medium text-slate-600 hover:underline">
              All incidents →
            </Link>
          </div>
          <div className="space-y-3">
            {incidents.isPending ? (
              <Spinner />
            ) : incidents.isError ? (
              <ErrorState error={incidents.error} />
            ) : incidents.data.items.length === 0 ? (
              <EmptyState title="No active incidents" />
            ) : (
              incidents.data.items.map((i) => <IncidentCard key={i.id} incident={i} />)
            )}
          </div>
        </section>
      </div>

      <section aria-labelledby="camps-heading">
        <h2 id="camps-heading" className="mb-3 text-xl font-semibold">
          Recently opened camps
        </h2>
        {camps.data && (
          <div className="grid gap-4 md:grid-cols-3">
            {camps.data.items.map((camp) => (
              <CampCard key={camp.id} camp={camp} />
            ))}
          </div>
        )}
      </section>

      <DistrictGrid />
    </div>
  );
}

function DistrictGrid() {
  const districts = useDistricts();
  return (
    <section aria-labelledby="districts-heading">
      <h2 id="districts-heading" className="mb-3 text-xl font-semibold">
        Districts
      </h2>
      {districts.isPending ? (
        <Spinner />
      ) : districts.isError ? (
        <ErrorState error={districts.error} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {districts.data.map((d) => (
            <li key={d.slug}>
              <Link
                to={`/districts/${d.slug}`}
                className="block rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-slate-400"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{d.name}</span>
                  {d.activeIncidents > 0 && (
                    <span
                      className="size-2 rounded-full bg-red-500"
                      title={pluralize(d.activeIncidents, 'active incident')}
                    />
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {d.openCamps > 0
                    ? `${pluralize(d.openCamps, 'camp')} · ${formatNumber(d.currentEvacuees)} sheltered`
                    : 'No camps open'}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
