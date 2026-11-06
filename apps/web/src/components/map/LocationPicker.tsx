import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { KERALA, TILE_ATTRIBUTION, TILE_URL } from './map-style';

type LatLng = { latitude: number; longitude: number };

const pinIcon = L.divIcon({
  className: '',
  html: '<span class="cl-pin"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

/** Round to 5 decimals = about 1 metre. More digits are false precision. */
const round = (n: number) => Math.round(n * 1e5) / 1e5;

function ClickToPick({ onPick }: { onPick: (point: LatLng) => void }) {
  useMapEvents({
    click: (e) => onPick({ latitude: round(e.latlng.lat), longitude: round(e.latlng.lng) }),
  });
  return null;
}

/** Keep the pin in view when the value changes from outside (e.g. "use my location"). */
function FollowValue({ value }: { value?: LatLng }) {
  const map = useMap();
  const lat = value?.latitude;
  const lng = value?.longitude;
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    if (!map.getBounds().contains([lat, lng])) map.setView([lat, lng], Math.max(map.getZoom(), 12));
  }, [map, lat, lng]);
  return null;
}

/**
 * Click the map (or drag the pin) to choose a location - easier and more accurate than
 * typing coordinates. Works together with the latitude/longitude inputs of a form.
 */
export default function LocationPicker({
  value,
  onChange,
  className = 'h-64',
}: {
  value?: LatLng;
  onChange: (point: LatLng) => void;
  className?: string;
}) {
  return (
    <div
      role="region"
      aria-label="Map: click to choose the location"
      className={`isolate overflow-hidden rounded-lg border border-slate-300 ${className}`}
    >
      <MapContainer
        {...(value
          ? { center: [value.latitude, value.longitude] as [number, number], zoom: 13 }
          : { bounds: KERALA })}
        scrollWheelZoom={false}
        className="size-full cursor-crosshair"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <ClickToPick onPick={onChange} />
        <FollowValue value={value} />
        {value && (
          <Marker
            position={[value.latitude, value.longitude]}
            icon={pinIcon}
            draggable
            title="Chosen location (drag to adjust)"
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = (e.target as L.Marker).getLatLng();
                onChange({ latitude: round(lat), longitude: round(lng) });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
