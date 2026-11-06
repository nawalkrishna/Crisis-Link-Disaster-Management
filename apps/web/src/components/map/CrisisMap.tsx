import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import L from 'leaflet';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapCamp, MapIncident, Priority } from '@crisislink/shared';
import { formatNumber, humanize, timeAgo } from '../../lib/format';
import { KERALA, SEVERITY_COLOR, TILE_ATTRIBUTION, TILE_URL, campColor } from './map-style';

/**
 * MAPS WITH LEAFLET
 *
 * Leaflet draws an interactive map from TILES: 256x256 px images, one per square of the world
 * at each zoom level, fetched from a tile server (here OpenStreetMap, which requires the
 * attribution shown in the corner). On top go our own "layers" - circles for camps,
 * warning badges for incidents.
 *
 * react-leaflet wraps Leaflet's imperative API (map.addLayer(...)) in React components.
 * This file is loaded lazily (see ./index.tsx), so visitors who never see a map don't
 * download the ~45 KB of Leaflet.
 */

type LatLng = { latitude: number; longitude: number };

/**
 * Incidents get a different SHAPE from camps (a rotated square with "!"), so the map doesn't
 * rely on colour alone - important for colour-blind users. A divIcon is plain HTML, which also
 * avoids Leaflet's default PNG marker icons (their image paths break under bundlers).
 */
const incidentIcons = new Map<Priority, L.DivIcon>();
function incidentIcon(severity: Priority) {
  let icon = incidentIcons.get(severity);
  if (!icon) {
    icon = L.divIcon({
      className: '',
      html: `<span class="cl-incident" style="background:${SEVERITY_COLOR[severity]}"><b>!</b></span>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10],
    });
    incidentIcons.set(severity, icon);
  }
  return icon;
}

const youIcon = L.divIcon({
  className: '',
  html: '<span class="cl-you"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/**
 * Maps that were already zoomed to their markers. Keyed by the Leaflet map instance (not a
 * useRef): in development React StrictMode mounts components twice, creating a second map,
 * and a ref would wrongly remember that the first, discarded map was fitted.
 */
const fittedMaps = new WeakSet<L.Map>();

/** Zoom to fit the markers the first time they arrive (later live updates don't move the map). */
function FitToMarkers({ points, you }: { points: LatLng[]; you?: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (fittedMaps.has(map) || points.length === 0) return;
    fittedMaps.add(map);
    if (points.length === 1) map.setView([points[0]!.latitude, points[0]!.longitude], 12);
    else
      map.fitBounds(
        points.map((p) => [p.latitude, p.longitude]),
        { padding: [30, 30] },
      );
  }, [map, points]);

  // When we learn where the visitor is, fly there (once per new location).
  const youLat = you?.latitude;
  const youLng = you?.longitude;
  useEffect(() => {
    if (youLat === undefined || youLng === undefined) return;
    fittedMaps.add(map);
    map.flyTo([youLat, youLng], 10, { duration: 0.8 });
  }, [map, youLat, youLng]);
  return null;
}

export default function CrisisMap({
  camps,
  incidents = [],
  you,
  highlightIds,
  className = 'h-[420px]',
  label = 'Map of relief camps and incidents',
}: {
  camps: MapCamp[];
  incidents?: MapIncident[];
  /** The visitor's location (from "find camps near me"). */
  you?: LatLng | null;
  /** Camp ids to draw larger (e.g. the nearest ones). */
  highlightIds?: ReadonlySet<string>;
  className?: string;
  label?: string;
}) {
  const points = useMemo(() => [...camps, ...incidents], [camps, incidents]);

  return (
    <div
      role="region"
      aria-label={label}
      className={`isolate overflow-hidden rounded-xl border border-slate-200 ${className}`}
    >
      <MapContainer
        bounds={KERALA}
        scrollWheelZoom={false} // don't hijack page scrolling; use +/- or pinch
        className="size-full"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <FitToMarkers points={points} you={you} />

        {camps.map((camp) => {
          const highlighted = highlightIds?.has(camp.id);
          return (
            <CircleMarker
              key={camp.id}
              center={[camp.latitude, camp.longitude]}
              radius={highlighted ? 11 : 8}
              pathOptions={{
                color: highlighted ? '#0f172a' : '#ffffff',
                weight: highlighted ? 3 : 2,
                fillColor: campColor(camp),
                fillOpacity: 0.9,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {camp.name}
              </Tooltip>
              <Popup>
                <div className="space-y-1 text-sm">
                  <Link to={`/camps/${camp.id}`} className="font-semibold text-slate-900">
                    {camp.name}
                  </Link>
                  <div className="text-slate-600">{camp.district}</div>
                  <div>
                    {formatNumber(camp.occupancy)} / {formatNumber(camp.capacity)} people
                    {camp.status !== 'OPEN' && ` · ${humanize(camp.status)}`}
                  </div>
                  {camp.openNeeds > 0 && (
                    <div className="text-amber-800">{camp.openNeeds} open needs</div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.latitude, incident.longitude]}
            icon={incidentIcon(incident.severity)}
            title={`${humanize(incident.type)} - ${incident.locationText}`}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <div className="font-semibold">
                  {humanize(incident.type)} · {humanize(incident.severity)}
                </div>
                <div>{incident.locationText}</div>
                <div className="text-slate-500">
                  {incident.district} · {timeAgo(incident.createdAt)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {you && (
          <Marker position={[you.latitude, you.longitude]} icon={youIcon} title="You are here" />
        )}
      </MapContainer>
    </div>
  );
}
