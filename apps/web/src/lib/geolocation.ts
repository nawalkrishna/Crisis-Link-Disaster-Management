import { useCallback, useState } from 'react';

export interface Position {
  latitude: number;
  longitude: number;
  /** Metres: how far off the reading may be (GPS: ~5-20 m, Wi-Fi/cell: hundreds). */
  accuracy: number;
}

/**
 * The browser's Geolocation API wrapped in a hook. The browser asks the person for permission;
 * we read the position only when they press a button, and only once (no tracking).
 * Works only on HTTPS pages (and localhost), like most powerful browser features.
 */
export function useGeolocation() {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const locate = useCallback(
    () =>
      new Promise<Position | null>((resolve) => {
        if (!('geolocation' in navigator)) {
          setError('Location is not available on this device.');
          return resolve(null);
        }
        setLocating(true);
        setError(null);
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            const next = {
              latitude: Number(coords.latitude.toFixed(5)),
              longitude: Number(coords.longitude.toFixed(5)),
              accuracy: Math.round(coords.accuracy),
            };
            setPosition(next);
            setLocating(false);
            resolve(next);
          },
          (err) => {
            setError(
              err.code === err.PERMISSION_DENIED
                ? 'Location permission was denied.'
                : 'Could not get your location.',
            );
            setLocating(false);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
        );
      }),
    [],
  );

  return { position, setPosition, error, locating, locate };
}
