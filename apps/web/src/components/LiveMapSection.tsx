import { useMemo } from 'react';
import { Link } from 'react-router';
import { LocateFixed, Navigation } from 'lucide-react';
import { useGeolocation } from '../lib/geolocation';
import { formatNumber } from '../lib/format';
import { useMapData, useNearbyCamps } from '../lib/queries';
import { CrisisMap, MapLegend } from './map';
import { Badge, Button, Card, EmptyState, ErrorState, Spinner } from './ui';

/**
 * Map of camps + incidents with a "find camps near me" panel. Used on the home page
 * (all of Kerala) and on district pages (one district).
 */
export function LiveMapSection({ district }: { district?: string }) {
  const map = useMapData(district);
  const geo = useGeolocation();
  const nearby = useNearbyCamps(geo.position);
  const highlightIds = useMemo(() => new Set(nearby.data?.map((c) => c.id) ?? []), [nearby.data]);

  return (
    <section aria-labelledby="map-heading" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="map-heading" className="text-xl font-semibold">
          Map
        </h2>
        <MapLegend />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {map.isError ? (
            <ErrorState error={map.error} onRetry={() => map.refetch()} />
          ) : (
            <CrisisMap
              camps={map.data?.camps ?? []}
              incidents={map.data?.incidents ?? []}
              you={geo.position}
              highlightIds={highlightIds}
              className="h-[360px] sm:h-[440px]"
            />
          )}
        </div>

        <Card className="flex flex-col gap-3">
          <div>
            <h3 className="font-semibold">Need shelter?</h3>
            <p className="text-sm text-slate-600">Find the closest camps that still have space.</p>
          </div>
          <Button onClick={() => void geo.locate()} loading={geo.locating}>
            <LocateFixed className="size-4" aria-hidden /> Find camps near me
          </Button>
          {geo.error && (
            <p role="alert" className="text-sm text-red-700">
              {geo.error}
            </p>
          )}

          {geo.position &&
            (nearby.isPending ? (
              <Spinner label="Searching" />
            ) : nearby.isError ? (
              <ErrorState error={nearby.error} />
            ) : nearby.data.length === 0 ? (
              <EmptyState title="No camps with space within 100 km">
                Call the district control room: 1077.
              </EmptyState>
            ) : (
              <ol className="divide-y divide-slate-100" aria-label="Nearest camps with space">
                {nearby.data.map((camp) => (
                  <li key={camp.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link
                        to={`/camps/${camp.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {camp.name}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {camp.district.name} · {formatNumber(camp.capacity - camp.occupancy)} places
                        free
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone="info">{camp.distanceKm} km</Badge>
                      {/* Hand off to the phone's maps app for turn-by-turn directions. */}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${camp.latitude},${camp.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline"
                      >
                        <Navigation className="size-3" aria-hidden /> Directions
                      </a>
                    </div>
                  </li>
                ))}
              </ol>
            ))}
          <p className="mt-auto text-xs text-slate-500">
            Distances are straight-line; roads may be longer or blocked.
          </p>
        </Card>
      </div>
    </section>
  );
}
