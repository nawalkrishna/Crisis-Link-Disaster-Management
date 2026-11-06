import { lazy, Suspense, type ComponentProps } from 'react';
import { MapPinned } from 'lucide-react';

/**
 * CODE SPLITTING: React.lazy() + dynamic import() puts Leaflet in its own JavaScript chunk.
 * It downloads only when a map is actually rendered; until then the placeholder shows.
 */
const CrisisMapImpl = lazy(() => import('./CrisisMap'));
const LocationPickerImpl = lazy(() => import('./LocationPicker'));

function MapPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-400 ${className ?? ''}`}
    >
      <MapPinned className="size-8 animate-pulse" aria-hidden />
      <span className="sr-only">Loading map…</span>
    </div>
  );
}

export function CrisisMap(props: ComponentProps<typeof CrisisMapImpl>) {
  return (
    <Suspense fallback={<MapPlaceholder className={props.className ?? 'h-[420px]'} />}>
      <CrisisMapImpl {...props} />
    </Suspense>
  );
}

export function LocationPicker(props: ComponentProps<typeof LocationPickerImpl>) {
  return (
    <Suspense fallback={<MapPlaceholder className={props.className ?? 'h-64'} />}>
      <LocationPickerImpl {...props} />
    </Suspense>
  );
}

/** Key for the camp and incident markers. */
export function MapLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded-full border-2 border-white bg-emerald-600 shadow" />
        Camp with space
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded-full border-2 border-white bg-amber-500 shadow" />
        Almost full
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded-full border-2 border-white bg-red-600 shadow" />
        Full
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rotate-45 rounded-sm border-2 border-white bg-red-900 shadow" />
        Active incident
      </li>
    </ul>
  );
}
