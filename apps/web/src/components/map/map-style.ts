import type { LatLngBoundsExpression } from 'leaflet';
import { KERALA_BOUNDS, type MapCamp, type Priority } from '@crisislink/shared';

/** Shared map settings (kept out of the .tsx files so React Fast Refresh keeps working). */

export const KERALA: LatLngBoundsExpression = [
  [KERALA_BOUNDS.south, KERALA_BOUNDS.west],
  [KERALA_BOUNDS.north, KERALA_BOUNDS.east],
];

/** OpenStreetMap's free tiles: fine for a project like this; heavy production use needs a paid provider. */
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Camp colour = how full it is. Same thresholds as the ProgressBar component. */
export function campColor(camp: Pick<MapCamp, 'status' | 'occupancy' | 'capacity'>) {
  if (camp.status !== 'OPEN') return '#dc2626';
  const ratio = camp.occupancy / Math.max(1, camp.capacity);
  return ratio >= 1 ? '#dc2626' : ratio >= 0.85 ? '#f59e0b' : '#059669';
}

export const SEVERITY_COLOR: Record<Priority, string> = {
  CRITICAL: '#7f1d1d',
  HIGH: '#c2410c',
  MEDIUM: '#a16207',
  LOW: '#475569',
};

/** Two optional form values -> a point for the LocationPicker (or undefined if incomplete). */
export function toPoint(latitude: unknown, longitude: unknown) {
  return typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
    ? { latitude, longitude }
    : undefined;
}

/** setValue options so a picked point counts as an edit and is validated like typed input. */
export const pickOptions = { shouldDirty: true, shouldValidate: true } as const;
