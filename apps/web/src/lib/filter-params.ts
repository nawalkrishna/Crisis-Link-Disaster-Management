import { useSearchParams } from 'react-router';

/**
 * Filters stored in the URL (?district=wayanad&priority=HIGH) instead of useState:
 * the filtered view can be bookmarked or shared in a WhatsApp group, and the
 * browser's back button undoes a filter change.
 */
export function useFilterParams<K extends string>(names: readonly K[]) {
  const [params, setParams] = useSearchParams();
  const values = Object.fromEntries(names.map((n) => [n, params.get(n) ?? ''])) as Record<
    K,
    string
  >;
  const offset = Number(params.get('offset') ?? 0) || 0;

  const set = (name: K | 'offset', value: string | number) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === '' || value === 0) next.delete(name);
        else next.set(name, String(value));
        if (name !== 'offset') next.delete('offset'); // a new filter starts at page 1
        return next;
      },
      { replace: true },
    );

  /** Only the non-empty values, ready to pass as API query params. */
  const query = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '')) as Partial<
    Record<K, string>
  >;
  return { values, query, offset, set };
}
