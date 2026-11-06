import { DISTRICTS } from '@crisislink/shared';
import { humanize } from '../lib/format';
import { Field, Select } from './ui';

export function EnumSelect({
  label,
  value,
  options,
  onChange,
  allLabel = 'All',
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  allLabel?: string;
}) {
  return (
    <Field label={label} className="min-w-36">
      {(a11y) => (
        <Select {...a11y} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{allLabel}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {humanize(o)}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

export function DistrictFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label="District" className="min-w-40">
      {(a11y) => (
        <Select {...a11y} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">All districts</option>
          {DISTRICTS.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

/** <option>s for a district <select> inside a form. */
export function DistrictOptions() {
  return DISTRICTS.map((d) => (
    <option key={d.slug} value={d.slug}>
      {d.name}
    </option>
  ));
}
